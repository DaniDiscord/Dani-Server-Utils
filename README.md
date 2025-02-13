<h1 align="center" style="position: relative;">
    Dani Server Utilities
</h1>
<h2 align="center" style="position: relative;">
    a discord utility bot for the Dani's Basement Discord Server.
</h2>

## Building & running

The bots configuration is managed by `dotenv`.

When you open the project, you will see a `.example.env` file. You need to rename it to just `.env`. The only fields that are essential for running the bot are `token`, `mongodb_connection_url` and `OWNER_ID`.

`token` is the bots token that can be acquired from the [discord developer portal](https://discord.com/developers/applications) if you're making a local instance or from the #token channel if you're a developer on the discord server.

```env
token = "token goes here"
mongodb_connection_url = "mongo url goes here"
OWNER_ID = "Your discord User ID here, or something else if you're testing permissions"
```

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

- !g for googling queries;
- !inactive for setting staff active and inactive roles
- !loa for the legend of ash
- !cb to put pre written code into code blocks
  As well any other specific commands that are found to be beneficial to the community.

**NOTE**: You should run `yarn install` in the root after pulling, every time in case of there being dependency changes.

```

```
