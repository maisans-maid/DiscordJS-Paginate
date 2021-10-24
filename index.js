const { MessageActionRow, MessageButton, Message, Interaction } = require('discord.js');

/**
 * The options for this pagination instance.
 * @typedef {object} PaginationOptions
 * @property {boolean} disableWrap Whether to disable the page wrapping or not
 * @property {number} timeout The timeout to use in milliseconds
 * @property {string} errorMessage The message to send to user when using a pagination that is not instantiated by them
 * @property {boolean} disableButtonsOnFinish Whether to disable all the buttons when the pagination ends, defaults to false
 * @property {boolean} removeButtonsOnFinish Whether to remove all the buttons when the pagination ends, defaults to false
 * @property {boolean} appendPageInfo Whether to append a page number to the footer of the embed, defaults to false
 * @property {string} pageInfoFormat The format of the pageInfo to append
 **@property {[UserId]} allowedUsers Array of user ids allowed to control the pagination embed
 * @property {ButtonOptions} previous The option for the previous button
 * @property {ButtonOptions} next The option for the next button
 * @property {ButtonOptions} stop The option for the stop button
 * @property {Message} editFrom the Message Object to edit, if none, will send message instead
 */

/**
  * The options for each button.
  * @typedef {object} ButtonOptions
  * @property {string} label The text to be displayed on this button
  * @property {MessageButtonStyle} style Style for this button
  * @property {RawEmoji} emoji Emoji for this button
  * @property {boolean} disable Make this button disabled throughout the whole pagination process.
  * @property {boolean} exclude Do not show this button on the pagination embed
 */

module.exports = class DiscordJSPaginate {
  constructor(array, message, options = {}){
    if (!Array.isArray(array))
        throw new Error('The first argument must be array of MessageEmbeds, received ' + typeof array);

    if (message instanceof Interaction)
        Object.defineProperty(this, 'interaction', { value: message });

    if (message instanceof Message)
        Object.defineProperty(this, 'message', { value: message });

    if (!this.interaction && !this.message)
        throw new Error('The second argument must be a Discord Message or Interaction instance.');

    if (typeof options !== 'object' || Array.isArray(options))
        throw new Error('The third argument must be PaginationOptions.');

    if (options.editFrom && !(options.editFrom instanceof Message))
        throw new Error('PaginationOptions#editFrom must be a Discord Message instance.');

    Object.defineProperty(this, 'editFrom', { value: options.editFrom || null });

    this._array = [ ...array ].flat();
    this._index = 0;
    this.collector = null;
    this.componentMessage = null;
    this.btn = {};
    this.disableWrap = options.disableWrap === true ? true : false;
    this.timeout = typeof options.timeout === 'number' ? options.timeout : 9e4;
    this.errorMessage = typeof options.errorMessage === 'string' ? options.errorMessage : 'You cannot use this component!';
    this.allowedUsers = Array.isArray(options.allowedUsers) ? options.allowedUsers : [];

    if (this.interaction) this.allowedUsers.push(this.interaction.user.id);
    if (this.message)     this.allowedUsers.push(message.author.id);

    this.options = options;

    for (const prop of ['disableButtonsOnFinish', 'removeButtonsOnFinish', 'appendPageInfo']){
      this[prop] = typeof options[prop] === 'boolean' ? options[prop] : false;
    };

    for (const [prop, key, def, style] of [['previous', 'previousbtn', '◀', 'SECONDARY'], ['next', 'nextbtn', '▶', 'SECONDARY'], ['stop', 'stopbtn', '❌', 'DANGER']]){
      if (options[prop]?.exclude === true) continue;
      this.btn[prop] = new MessageButton().setCustomId(prop).setLabel(options[prop]?.label || def).setStyle(options[prop]?.style || style).setDisabled(options[prop]?.disable === true ? true : false);
      if (options[prop]?.emoji) this.btn[prop].setEmoji(options[prop]?.emoji);
    };

    if (this.appendPageInfo === true){
      for (const [index, embed] of this._array.entries()){
        if (!embed.footer) embed.footer = {};
        const format = typeof options.pageInfoFormat === 'string' ? options.pageInfoFormat : 'Page %page of %total' + (embed.footer.text ? '\u2000|\u2000' : '');
        embed.footer.text = format.replace(/\%page|\%total/g, x => { return {'%page': index + 1, '%total': this._array.length }[x]}) + (embed.footer.text || '');
      };
    };
  };

  async exec(){
    if (!Object.keys(this.btn).length) throw new Error('Pagination cannot start as all of the navigation buttons are disabled.');
    if (!Object.values(this.btn).some(button => !button.disabled)) throw new Error('Pagination cannot start as all of the navigation buttons are disabled.')
    if (this.disableWrap) this.btn.previous.setDisabled(true);

    const firstMessage = this.generateWEMO(this._array[0]);

    if (this.editFrom){
      this.componentMessage = await this.editFrom.edit(firstMessage);
    } else if (this.interaction){
       this.componentMessage = await ((this.interaction.deferred || this.interaction.replied) ? this.interaction.editReply(firstMessage) : this.interaction.reply(firstMessage));
    } else if (this.message){
      this.componentMessage = await this.message.channel.send(firstMessage);
    };

    this.collector = this.componentMessage.createMessageComponentCollector({ componentType: 'BUTTON', time: this.timeout });

    this.collector
    .on('collect', i => {
      if (!this.allowedUsers.includes(i.user.id)) return i.reply({ content: this.errorMessage, ephemeral: true });
      if (i.customId === 'previous')              return i.update(this.previous());
      if (i.customId === 'next')                  return i.update(this.next());
      if (i.customId === 'stop')                  return this.stop();
    })
    .on('end', collected => {
      let components = [ new MessageActionRow().addComponents(...Object.keys(this.btn).map(button => this.btn[button].setDisabled(true))) ];
      if (this.removeButtonsOnFinish) components = [];
      if (collected.last()){
        return collected.last().update({ embeds: [this.currentPage()], components });
      } else {
        return this.componentMessage.edit({ embeds: [this.currentPage()], components });
      };
    });

    return { collector: this.collector, message: this.componentMessage };
  };

  /**
   * Generate the next (, previous, and stop, if included) button;
   * @return {MessageActionRow} [Represents an action row containing message components.]
   */
  generateComponents(){
    return new MessageActionRow().addComponents(...Object.values(this.btn));
  };

  /**
   * Restores disabled buttons to their active state
   * @return {Paginate} [This module]
   */
  restoreComponents(){
    Object.keys(this.btn).forEach(button => this.btn[button] = this.options[button]?.disable === true ? this.btn[button] : this.btn[button].setDisabled(false));
    return this;
  };

  /**
   * Generates a WebhookEditMessageOptions.
   * @param  {MessageEmbed} embed The MessageEmbed instance to display on the paginator's current state.
   * @return {WebhookEditMessageOptions} Options that can be passed into editMessage.
   */
  generateWEMO(embed){
    return { embeds: [embed], components: [ this.generateComponents() ] }
  };

  /**
   * Cycle backwards through the MessageEmbed array and get the current page's Message Embed.
   * @return {WebhookEditMessageOptions} Options that can be passed into editMessage.
   */
  previous(){
    this._index --;
    if (this.disableWrap && this._index === 0) this.btn.previous.setDisabled(true);
    if (this.disableWrap && this.btn.previous.disabled && this._index !== 0 && !(this.options.previous?.disable === true)) this.btn.previous.setDisabled(false);
    if (this.disableWrap && this.btn.next.disabled && this._index === this._array.length - 2) this.btn.next.setDisabled(false);
    if (this._index < 0) this._index = this._array.length - 1;

    return this.generateWEMO(this.currentPage());
  };

  /**
   * Cycle forwards through the MessageEmbed array and get the current page's Message Embed.
   * @return {WebhookEditMessageOptions} Options that can be passed into editMessage.
   **/
  next(){
    this._index ++;
    if (this.disableWrap && this._index === this._array.length - 1) this.btn.next.setDisabled(true);
    if (this.disableWrap && this.btn.next.disabled && this._index !== this._array.length - 1 && !(this.options.next?.disable === true)) this.btn.next.setDisabled(false);
    if (this.disableWrap && this.btn.previous.disabled && this._index === 1) this.btn.previous.setDisabled(false);
    if (this._index > this._array.length - 1) this._index = this._array = 0;

    return this.generateWEMO(this.currentPage());
  };

  /**
   * Force stop this instance's component collector and emit the end event.
   * @return {void}
   */
  stop(){
    this.collector.stop();
  };

  /**
   * Get the MessageEmbed of the current page.
   * @return {[type]} [description]
   */
  currentPage(){
    return this._array[this._index];
  };
};
