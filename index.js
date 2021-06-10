try {
  const D = require('discord.js');
} catch (e){
  throw new Error('This package requires discord.js to work.');
};

/**
 * The options for this pagination instance.
 * @typedef {Object} PaginationOptions
 * @property {function} [filter] The filter function for the collector
 * @property {number} [timeout] The timeout to use in milliseconds
 * @property {boolean} [includeStopBtn] Whether to include a stop button, defaults to true
 * @property {boolean} [includePrevBtn] Whether to include a previous button, defaults to true
 * @property {string} [previousbtn] The Emoji ID or Emoji Unicode to use as previous button
 * @property {string} [nextbtn] The Emoji ID or Emoji Unicode to use as next button
 * @property {string} [stopbtn] The Emoji ID or Emoji Unicode to use as stop button
 * @property {boolean} [removeUserReactions] Whether to remove user reactions upon pagination
 * @property {boolean} [removeAllReactions] Whether to remove all reactions upon end of pagination
 * @property {boolean} [appendPageInfo] Whether to append the page info on the footer
 * @property {string} [pageInfoFormat] The format for the page info
 * @property {boolean} [disableWrap] Whether to stop the collector when it reaches the max page, works only if prevbutton is disabled
 * @property {Message} [editFrom] the Message Object to edit, if none, will send message instead
 */

/**
 * Ease pagination of MessageEmbeds
 * @param {MessageEmbed} array array of MessageEmbeds to paginate
 * @param {Message} message The Message reference
 * @param {PaginationOptions} options The options for this pagination instance
 */
module.exports = class Paginate {
  constructor(array, message, options = {}){
    const D = require('discord.js');
    if (!Array.isArray(array)) throw new Error('The first argument must be array of MessageEmbeds, received ' + typeof array);
    if (!(message instanceof D.Message)) throw new Error('The second argument must be a Discord Message Instance.');
    if (typeof options !== 'object' || Array.isArray(options)) throw new Error('The third argument must be PaginationOptions.');
    if (options.editFrom && !(options.editFrom instanceof D.Message)) throw new Error('PaginationOptions#editFrom must be a Discord Message Instance.');

    Object.defineProperty(this, 'message', { value: message });
    Object.defineProperty(this, 'editFrom', { value: options.editFrom || null });

    this._array = [ ...array ].flat();
    this._index = 0;
    this.collector = null;
    this.reactionmessage = null;
    this.btn = {};
    this.disableWrap = options.disableWrap === true && !options.includePrevBtn ? true : false;

    if (options.appendPageInfo === true){
      for (const [index, embed] of this._array.entries()){
        if (!embed.footer) embed.footer = {};
        const format = typeof options.pageInfoFormat === 'string' ? options.pageInfoFormat : 'Page %page of %total.' + (embed.footer.text ? '\u2000|\u2000' : '');
        embed.footer.text = format.replace(/\%page|\%total/g, x => { return {'%page': index + 1, '%total': this._array.length }[x]}) + (embed.footer.text || '');
      };
    };
    for (const [prop, type, def] of [['timeout', 'number', 9e4 ], ['filter', 'function', (_, user) => user.id === this.message.author.id ]]){
      this[prop] = typeof options[prop] === type ? options[prop] : def;
    };
    for (const [prop, key, def] of [['previous', 'previousbtn', '◀'], ['next', 'nextbtn', '▶'], ['stop', 'stopbtn', '❌']]){
      this.btn[prop] = options[key]?.id || options[key] || def;
    };
    for (const prop of ['removeAllReactions', 'removeUserReactions', 'includePrevBtn', 'includeStopBtn', 'appendPageInfo']){
      if (typeof options[prop] === 'boolean'){
        this[prop] = options[prop]
      } else {
        this[prop] = options[prop] === undefined ? true : false;
      };
    };
  };

  /**
   * Executes this pagination function
   * @return {Promise<ReactionCollector>}
   */
  async exec(){
    const collect = async ({ emoji: { name, id }, users }) => {
      const filter = (key) => [name, id].includes(this.btn[key]);
      const getKey = () => Object.keys(this.btn).find(key => filter(key));
      await this[getKey()]().catch(console.error);
      this.removeUserReactions ? await users.remove(this.message.author.id) : undefined;
      return;
    };

    if (this.editFrom){
      this.reactionmessage = await this.editFrom.edit(this._array[0]).catch(err => { return {error: err}});
    } else {
      this.reactionmessage = await this.message.channel.send({ embed: this._array[0] }).catch(err => { return {error: err}});
    };

    if (this.reactionmessage.error){
      return Promise.reject(this.reactionmessage.error);
    } else if (this._array.length == 1){
      return Promise.resolve(this.reactionmessage);
    } else {
      for (const [prop, reaction] of Object.entries(this.btn)){
        if (prop === 'previous' && !this.includePrevBtn || prop === 'stop' && !this.includeStopBtn) continue;
        await this.reactionmessage.react(reaction);
      };
      this.collector = this.reactionmessage.createReactionCollector(this.filter, { idle: this.timeout, dispose: !this.removeUserReactions })
      .on('collect', async reaction => await collect(reaction))
      .on('remove', async reaction => this.removeUserReactions === false ? await collect(reaction) : null)
      .on('end', async () => {
        this.removeAllReactions && !this.reactionmessage.deleted ? await this.reactionmessage.reactions.removeAll().catch(() => {}) : null;
        return this.destroy();
      });
      return Promise.resolve({ collector: this.collector, message: this.reactionmessage });
    };
  };


  /**
  * Moves the index up to view the next element from the array
  * Circular - will revert to 0 if the index exceeds array length
  * @return {?Message} The Message Object of the edited message
  */
  next(){
    if (!this.executed) return Promise.reject('Paginate#next: You need to call exec() first before using other functions.');;
    if (!this._array.length){
      return undefined;
    };
    if (this._index === this._array.length - 1){
      this._index = -1;
    };
    this._index++;
    if (this._index === this._array.length - 1 && this.disableWrap){
        return this.reactionmessage.edit(this._array[this._index]).then(() => this.stop());
    };
    return this.reactionmessage.edit(this._array[this._index])
  };

  /**
  * Moves the index down to view the previous element from the array
  * Circular - will revert to the max index if the index is less than 0
  * @returns {Message} The Message Object of the edited message
  */
  previous(){
    if (!this.executed) return Promise.reject('Paginate#previous: You need to call exec() first before using other functions.');
    if (!this._array.length){
      return undefined;
    };
    if (this._index === 0) this._index = this._array.length;
    this._index--;
    return this.reactionmessage.edit(this._array[this._index]);
  };

  /**
  * Stops this pagination
  * @returns {Collector#event.end} Emitted when the collector is finished collecting.
  */
  stop(){
    if (!this.executed) return Promise.reject('Paginate#stop: You need to call exec() first before using other functions.');
    return Promise.resolve(this.collector?.stop());
  };

  /**
   * Removes all references for this instance and prepares it for garbage collection
   * @return {this} empty object
   */
  destroy(){
    for (const prop of Object.keys(this)){
      delete this[prop];
    };
    return this;
  };

  /**
   * Checks if exec function has been used or not.
   * @return {boolean} Whether the exec function has been used or not.
   */
  get executed(){
    return Boolean(this.reactionmessage);
  };
};
