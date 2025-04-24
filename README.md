<h1 align="center" style="position: relative;">
    Dani Server Utilities
</h1>
<h2 align="center" style="position: relative;">
    <a href="https://discord.gg/danii" style="text-decoration: underline; cursor: pointer;">Dani's Discord</a> utility bot!
</h2>

## Building & running

The bots configuration is managed by an environment file

When you open the project, you will see a `.example.env` file. You need to rename it to just `.env`. The only fields that are essential for running the bot are `token`, `mongodb_connection_url` and `OWNER_ID`.

```env
OWNER_ID = ""
MONGODB_URL = "mongodb+srv://[dbuser]:[password]@cluster0.[endpoint]/?retryWrites=true&w=majority"
BOT_TOKEN = ""
```

### Where do I get the "bot token"?

The token refers to the application token, which you can get via the [Discord Developer Portal](https://discord.com/developers/applications/). Create a new one, go to the "Bot" tab, and get the token.

### Where do I get this mongodb_connection_url?

As it stands, you'll need to host your own mongodb server.  
To get started with this quickly, we recommend installing [Docker](https://www.docker.com/) and using the [mongo image](https://hub.docker.com/_/mongo).  
To get the most basic mongodb server running with this, run `docker run --name mongo -p 27017:27017 -d mongo:6.0.6`.  
If you run it like that, your `mongodb_connection_url` will be `mongodb://localhost:27017/`

After you are done with the configuration, run a local docker container.

## How do i setup docker?

[Install Docker Desktop for easier setup](https://docs.docker.com/get-started/get-docker/), then run the following commands in a local terminal inside your folder:

```bash
docker-compose build

docker compose up
```

Everything else can stay the same.
If you open docker desktop, or [use the VSCode Extension](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-docker), you should see a container called "dani_server_utils", you can run it by clicking the plus button.

Some of the current commands include:

- a manager for our staff applications (/staffapp)
- a link detection feature
- server channel configuration commands (like /autoslow, /poll, and /anchor)
- and more to come!

**NOTE**: You should run `bun i` in the root after pulling, every time in case of there being dependency changes.
