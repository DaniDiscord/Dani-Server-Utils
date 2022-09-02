<h1 align="center" style="position: relative;">
    Dani Server Utilities
</h1>
<h2 align="center" style="position: relative;">
    a discord utility bot for the Dani's Basement Discord Server.
</h2>

## Building & running

The bots configuration is managed by `dotenv`.

When you open the project, you will see a `.example.env` file. You need to rename it to just `.env`. The only fields that are essential for running the bot are `token` and `mongodb_connection_url`.

`token` is the bots token that can be acquired from the [discord developer portal](https://discord.com/developers/applications) if you're making a local instance or from the #token channel if you're a developer on the discord server.

```env
token = "token goes here"
mongodb_connection_url = mongo url goes here
```

After you are done with the configuration, a local instance of the bot can be hosted by using

```bash
yarn dev
```

or [npm is not recommended and might break stuff, preferably you should be using yarn]:

```bash
npm run dev
```

Some of the current commands include:

- !g for googling queries;
- !inactive for setting staff active and inactive roles
- !loa for the legend of ash
- !cb to put pre written code into code blocks
  As well any other specific commands that are found to be beneficial to the community.

**NOTE**: You should run `yarn install` in the root after pulling, every time in case of there being dependency changes.
