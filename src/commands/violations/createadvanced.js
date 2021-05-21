const fetch = require("node-fetch")
const { MessageEmbed } = require("discord.js")
const { getMessageResponse } = require("../../utils/responseGetter")
const { handleErrors } = require("../../utils/functions")
const Command = require("../../base/Command")

class CreateViolationAdvanced extends Command {
	constructor(client) {
		super(client, {
			name: "createadvanced",
			description: "Creates a violation - Advanced method",
			aliases: ["banadvanced", "createadv", "banadv"],
			category: "violations",
			dirname: __dirname,
			enabled: true,
			memberPermissions: ["BAN_MEMBERS"],
			botPermissions: ["SEND_MESSAGES", "EMBED_LINKS"],
			ownerOnly: false,
			cooldown: 3000,
			requiredConfig: false
		})
	}
	async run(message, _, config) {
		if (!config.apikey) return message.reply("No API key set")
		const messageFilter = response => {
			return response.author.id === message.author.id
		}
		const reactionFilter = (reaction, user) => {
			return user.id == message.author.id
		}

		const playername = (await getMessageResponse(message.channel.send("Please type in a playername for the violation"), messageFilter))?.content
		if (playername === undefined) return message.channel.send("Didn't send playername in time")

		const admin_message = (await getMessageResponse(message.channel.send("Please type in admin user ID for the violation"), messageFilter))
		if (admin_message === undefined) return message.channel.send("Didn't send admin user ID in time")
		const admin_user = admin_message.mentions.users.first() || await this.client.users.fetch(admin_message.content)
		if (!admin_user) return message.channel.send("Sent user is not valid!")

		const ruleid = (await getMessageResponse(message.channel.send("Please type in ObjectID of rule that has been broken"), messageFilter))?.content
		if (ruleid === undefined) return message.channel.send("Didn't send rule ObjectID in time")

		let desc = (await getMessageResponse(message.channel.send("Please type in description of the violation or `none` if you don't want to set one"), messageFilter))?.content
		if (desc.toLowerCase() === "none") desc = undefined

		let proof = (await getMessageResponse(message.channel.send("Please send a link to proof of the violation or `none` if there is no proof"), messageFilter))?.content
		if (proof.toLowerCase() === "none") proof = undefined

		let timestamp = (await getMessageResponse(message.channel.send("Please send a value representing the date of the violation. Type in `now` to set the current time"), messageFilter))?.content
		if (timestamp.toLowerCase() === "now") timestamp = (new Date).toISOString()
		else {
			if (isNaN(Date.parse(timestamp))) timestamp = (new Date).toISOString()
			else timestamp = Date.parse(timestamp).toISOString()
		}

		let embed = new MessageEmbed()
			.setTitle("FAGC Violations")
			.setColor("RED")
			.setTimestamp()
			.setAuthor("FAGC Community")
			.setDescription(`Create FAGC violation for \`${playername}\``)
		embed.addFields(
			{ name: "Admin user", value: `<@${admin_user.id}> | ${admin_user.tag}`, inline: true },
			{ name: "Player name", value: playername, inline: true },
			{ name: "Rule ID", value: ruleid, inline: true },
			{ name: "Violation description", value: desc, inline: true },
			{ name: "Proof", value: proof },
			{ name: "Violated At (ISO)", value: timestamp }
		)
		message.channel.send(embed)
		const confirm = await message.channel.send("Do you wish to create this rule violation?")
		confirm.react("✅")
		confirm.react("❌")
		let reactions
		try {
			reactions = (await confirm.awaitReactions(reactionFilter, { max: 1, time: 120000, errors: ["time"] }))
		} catch {
			return message.channel.send("Timed out.")
		}
		let reaction = reactions.first()
		if (reaction.emoji.name === "❌")
			return message.channel.send("Violation creation cancelled")
		try {
			const responseRaw = await fetch(`${this.client.config.apiurl}/violations/create`, {
				method: "POST",
				body: JSON.stringify({
					playername: playername,
					admin_id: admin_user.id,
					broken_rule: ruleid,
					proof: proof,
					description: desc,
					automated: false,
					violated_time: timestamp
				}),
				headers: { "apikey": config.apikey, "content-type": "application/json" }
			})
			const response = await responseRaw.json()
			if (response._id && response.broken_rule && response.violated_time) {
				return message.channel.send(`Violation created! _id: \`${response._id}\``)
			} else if (response.error && response.description === "Rule must be a RuleID") {
				return message.channel.send("RuleID is an invalid rule ObjectID. Please check rules")
			} else {
				return handleErrors(message, response)
			}
		} catch (error) {
			console.error(error)
			return message.channel.send("Error creating violation. Please check logs.")
		}
	}
}
module.exports = CreateViolationAdvanced