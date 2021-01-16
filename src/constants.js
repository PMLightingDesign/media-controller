module.exports.PLAYER_NAME = 'mpv'; // What media player are we using?

module.exports.DEFAULTS = {
  args: ["--idle=yes", "--force-window=yes", "--keep-open=yes"],
  exclusive: true,
  controllerOptions: {
    responseCacheDepth: 256
  }
}
