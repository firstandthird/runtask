'use strict';
const async = require('async');

class RunTask {
  constructor() {
    this.tasks = {};
    this.data = undefined;
  }

  register(name, fn) {
    this.tasks[name] = fn;
  }

  runOne(data, task, done) {
    if (typeof done !== 'function') {
      done = task;
      task = data;
      data = false;
    }
    if (Array.isArray(task)) {
      return async.each(task, this.runOne.bind(this), done);
    }
    const fn = this.tasks[task];
    if (!fn) {
      return done(new Error(`${task} does not exist`));
    }
    if (typeof fn.execute === 'function') {
      if (data) {
        return fn.execute(data, done);
      }
      return fn.execute(done);
    }
    if (Array.isArray(fn)) {
      return this.runOne(fn, done);
    }
    if (data) {
      fn(data, done);
    } else {
      fn(done);
    }
  }

  run(tasks, data, done) {
    let process = this.runOne.bind(this);
    if (typeof data === 'function') {
      done = data;
    } else {
      process = (item, processDone) => {
        this.runOne.bind(this)(data, item, processDone);
      };
    }
    // a string can be either the name of a single task function or class
    // or the name of a list of task functions / classes
    if (typeof tasks === 'string') {
      // if it's a list already it doesn't need to be cast:
      if (this.tasks[tasks] && Array.isArray(this.tasks[tasks])) {
        tasks = this.tasks[tasks];
      } else {
        tasks = [tasks];
      }
    }
    if (!tasks) {
      return done(new Error(`${tasks} does not exist`));
    }
    async.eachSeries(tasks, process, (err) => {
      if (typeof done === 'function') {
        return done(err);
      }
      if (err) {
        throw err;
      }
    });
  }
}

module.exports = RunTask;
