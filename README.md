# DiscordJS-Paginate
A simple utility with plenty of controls to paginate discord message embeds with the discord.js library.

This project was initially intended to use for [Mai](https://github.com/maisans-maid/Mai), however, you can use this utility too. If you find any bugs/issues, don't hesitate to open an issue or make a pull request.

## Installation
```
npm i discordjs-paginate
```

## Basic Usage Example
```js
const { MessageEmbed } = require('discord.js');
const Paginate = require('discordjs-paginate');

// Build the embeds beforehand and place them inside an array
const embeds = [ new MessageEmbed(), new MessageEmbed(), new MessageEmbed() ]

// Pass in the array of message embeds and the discord.js message instance, then execute by using the exec() function
new Paginate(embeds, message).exec()
```

## Class Parameters
```js
new Paginate(embeds, message, options)
```
|Name|Type|Default value|isOptional|Description|
|:---:|:---:|:---:|:---:|---|
[embeds](https://discord.js.org/#/docs/main/stable/class/MessageEmbed)|array|`none`|false|The array of MessageEmbeds to paginate
[message](https://discord.js.org/#/docs/main/stable/class/Message)|object|`none`|false|The Message Object reference for this pagination to use
[options](#PaginationOptions)|object|`{}`|true|The options for this pagination instance

### Allowing other users to paginate
To allow other users on paginating the embed, you will just have to pass a new filter function to the PaginationOptions field. Note: This replaces the default filter function used in the class.
```js
new Paginate(embeds, message, {
  // allows all user and reaction to be processed
  filter: (reaction, user) => true,

  // Allow these 2 users to paginate the embed
  filter: (reaction, user) => ['12343567543','1234565432', message.author.id].includes(user.id);
});
```

### Setting / Disabling timeouts
If you want to keep the pagination running (as long as your bot process does not end), you can set the timeout to 0 in the PaginationOptions. The same thing for setting timeouts. The timeout defaults to 90000 or 90 seconds.
```js
new Paginate(embeds, message, {
  timeout: 0     // pagination will never expire.

  timeout: 30000 // pagination will end after 30 seconds.
});
```

### Disabling other buttons
You can choose to hide/disable buttons if you don't want your pagination to be clicked on previous or forcefully stopped. For example, you don't want the embed to show previous pages after the user clicked next, or don't want the pagination to be stopped manually, you can set both of their properties to false.
```js
new Paginate(embeds, message, {
  includeStopBtn: false, // Will not include the stop button
  includePrevBtn: false  // Will not include the previous button
});
```
![image](https://user-images.githubusercontent.com/56829176/116891528-63236000-ac61-11eb-8d36-3a3c18dbfee1.png)

### Setting the button
By default, the button the pagination will use will be '◀' for previous, '▶' for next, and '❌' for stop. However, you may replace them with any button you like. They can be a Unicode Emoji or a Discord Emoji ID. BE wary that your bot has to have access to the particular emoji when using id or you will encounter an `Unknown Emoji` Error.
```js
new Paginate(embeds, message, {
  // You can choose your own button by with a unicode emoji.
  previousbtn: '⏮️',
  nextbtn: '⏭️',
  stopbtn: '⏹️',

  // Or you can use a discord emoji id instead for a custom emoji.
  previousbtn: '73838471837462341',
  nextbtn: '7383847112462312312',
  stopbtn: '1231231231231221212',
});
```

### Controlling the reactions
You can disable the emojis from being removed by the bot after a click, say, you want to keep the emoji and just let the user unreact to move the pagination again. When using the pagination in a DM, you might also encounter an error when attempting to remove the user emoji. To solve this, you can either remove the user reaction upon pagination for its entire purpose or disable it on DM channels only.
```js
new Paginate(embeds, message, {
  // Disable automatic removal of reactions upon pagination
  removeUserReactions: false,

  // Set to false only when the channel type is DM
  removeUserReactions: message.channel.type !== 'dm';
});
```
You can also disable the Paginator from removing all commands when the Pagination is terminated (via a stop button from a user or a timeout) by setting removeAllReactions to false
```js
new Paginate(embeds, message, {
  // Disable automatic removal of reactions upon end of pagination
  removeAllReactions: false
});
```

### Add page number on footer
If you want to add page number to the footer, you can set appendPageInfo to true inside the options object. By default, the footer would display (Page 1 of 3) at the very beginning of your footer. If you have placed a text on the footer, the text will be moved to give way to the page info. Make sure the footer doesn't exceed the limits imposed by Discord before adding this info.
```js
new Paginate(embeds, message, {
  // Place page info at the footer of every embed
  appendPageInfo: true
});
```
If you want to have your own format, say, in your own language with the page info, you can pass a string to pageInfoFormat with the format you would like to use, while using '%page' and '%total' as variables for the current page and the total page.
```js
new Paginate(embeds, message, {
  appendPageInfo: true,
  pageInfoFormat: '%page/%totalページ'
});
// Will show "1/3ページ" on footer, if the current page is 1 and there are 3 pages in all.
```
If you have text in your footer, and you used your own pageInfoFormat, you might notice that there is no space between the text, to solve this, you just have to insert a whitespace after your string in the pageInfoFormat.
```js
new Paginate(embeds, message, {
  appendPageInfo: true,
  pageInfoFormat: '%page/%totalページ\u2000|\u2000' // or you can just use a space instead
});
// Will show "1/3ページ  |  A footer text that i previously placed here." on footer, if the current page is 1 and there are 3 pages in all.
```

### Disabling Wrapping
Wrapping is when the pagination loops and displays the very first page when you click on next on the last page, or when it displays the very last page when you click prev on the first page. To disable this behavior, set the disableWrap option to true.
```js
new Paginate(embeds, message, {
  disableWrap: true // This will prevent the pagination from wrapping
});
```

### Editing from another message
Instead of sending a new message, you can use a previously sent message (authored by the bot) to use as the pagination message by passing the message object to the `editFrom` options.
```js
new Paginate(embeds, message, {
  editFrom: oldMessage // A discord Message Object authored by the bot.
});
```

Remember that whenever you want to start the pagination, you need to call the `.exec()` function.

## Class Methods
The Class provides a useful methods to interact with the Paginate class
### `.exec()`
Executes the pagination.

Returns: `Promise<Object>` An object containing both the collector and the message reference of the pagination.
### `.next()`
Display the next page of the embed. Used internally by the class, but can be manually controlled.

Returns: `Promise<Message>` The Message instance of the paginated message.
### `.previous()`
Display the previous page of the embed. Used internally by the class, but can be manually controlled.

Returns: `Promise<Message>` The Message instance of the paginated message.
### `.stop()`
Stops the paginated embed. Used internally by the class, but can be manually controlled.

Returns: `Promise<void>` [Collector#stop](https://discord.js.org/#/docs/main/stable/class/Collector?scrollTo=stop)
### `.destroy()`
Removes all references for this instance and prepares it for garbage collection.

Returns: this
### `executed` (getter)
Checks if exec function has been used or not.

Returns: `boolean` True if executed, false if not.

## PaginationOptions
|Name|Type|Description|
|:---:|:---:|---|
filter|`function`|The filter function for the collector.|
timeout|`number`| The timeout to use in milliseconds.|
includeStopBtn|`boolean`|Whether to include a stop button, defaults to true.|
includePrevBtn|`boolean`|Whether to include a previous button, defaults to true.|
previousbtn|`string`|The Emoji ID or Emoji Unicode to use as previous button.|
nextbtn|`string`|The Emoji ID or Emoji Unicode to use as next button.|
stopbtn|`string`|The Emoji ID or Emoji Unicode to use as stop button.|
removeUserReactions|`boolean`|Whether to remove user reactions upon pagination.|
removeAllReactions|`boolean`|Whether to remove all reactions upon end of pagination.|
appendPageInfo|`boolean`|Whether to append the page info on the footer.|
pageInfoFormat|`string`|The format for the page info.|
disableWrap|`boolean`|Whether to stop the collector when it reaches the max page, works only if prevbutton is disabled.|
editFrom|[`Message`](https://discord.js.org/#/docs/main/stable/class/Message)|The message object that pagination will use to edit instead of sending a new one.|


## Simple Example
```js
const Discord = require('discord.js');
	const Paginate = require('discordjs-paginate');
	const client = new Discord.Client({
		intents: [Discord.Intents.ALL],
		partials: ['USER', 'CHANNEL', 'GUILD_MEMBER', 'MESSAGE', 'REACTION']
	});

	client.on('message', (message) => {
		if (message.content.startsWith('paginate')) {

			// Note: U have to define embeds here by making an array for the embeds
			/*
			const embeds = [ new Discord.MessageEmbed().setTitle('First'), new Discord.MessageEmbed().setTitle('Second'), new Discord.MessageEmbed().setTitle('Third')]
			*/
			const paginate = new Paginate(embeds, message, {
				appendPageInfo: true,
				timeout: 60000,
				previousbtn: '841961355799691264',
				nextbtn: '841961438884003870',
				stopbtn: '841962179490349068',
				// removeUserReactions: message.channel.type !== 'dm'
				removeUserReactions: false,
				removeAllReactions: false
			});
			await paginate.exec();
		}
	});

client.on('ready', () => console.log(`Ready`))
```
