'use strict';
const async = require('async');

class RunTask {
  constructor(options) {
    this.tasks = {};
    options = options || {};
    this.onStart = options.onStart || function() { };
    this.onFinish = options.onFinish || function() { };
  }

  register(name, fn) {
    this.tasks[name] = fn;
  }

  runOne(task, data, done) {
    const onStart = this.onStart;
    const onFinish = this.onFinish;
    if (Array.isArray(task)) {
      return async.each(task, (taskItem, eachDone) => {
        this.runOne(taskItem, data, eachDone);
      }, done);
    }
    const fn = this.tasks[task];
    if (!fn) {
      return done(new Error(`${task} does not exist`));
    }
    if (typeof fn.execute === 'function') {
      onStart(task);
      return fn.execute(data, (err, result) => {
        onFinish(task);
        return done(err, result);
      });
    }
    if (Array.isArray(fn)) {
      return this.runOne(fn, data, done);
    }
    onStart(task);
    fn(data, done);
    onFinish(task);
  }

  run(tasks, data, done) {
    // data param is optional:
    if (typeof data === 'function') {
      done = data;
      data = {};
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
    async.eachSeries(tasks, (task, eachDone) => {
      this.runOne(task, data, eachDone);
    }, (err) => {
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
