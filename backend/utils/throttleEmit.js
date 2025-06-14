let emitTimers = {};

exports.throttleEmit = (io, event, data, key = 'default', delay = 1000) => {
  clearTimeout(emitTimers[key]);
  emitTimers[key] = setTimeout(() => {
    io.emit(event, data);
    delete emitTimers[key];
  }, delay);
};
