'use strict';
const async = require('async');

class RunTask {
  constructor(options) {
    this.tasks = {};
    this.options = options || {};
    this.onStart = this.options.onStart || function() { };
    this.onFinish = this.options.onFinish || function() { };
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
    let fn = this.tasks[task];
    if (Array.isArray(fn)) {
      return this.runOne(fn, data, done);
    }
    if (!fn) {
      return done(new Error(`${task} does not exist`));
    }
    if (this.options.bind) {
      fn = fn.bind(this.options.bind);
    }
    onStart(task, data);
    fn(data, (err, result) => {
      onFinish(task, data, result);
      done(err, result);
    });
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
      // if the string maps on to a list of tasks,
      // treat that list as the intended top-level item:
      if (this.tasks[tasks] && Array.isArray(this.tasks[tasks])) {
        return this.run(this.tasks[tasks], done);
      }
      // otherwise cast it as a list and continue:
      tasks = [tasks];
    }
    // if the top-level is a list of tasks, and any of those subtasks is a string referring to a list of tasks
    // that sub-list needs to be merged into the top-level list:
    const newTasks = [];
    if (!tasks) {
      return done(new Error(`${tasks} does not exist`));
    }
    tasks.forEach((subtask) => {
      // if any subtasks in that array are strings that map to lists, we expand them into the top-level list:
      if (typeof subtask === 'string' && this.tasks[subtask] && Array.isArray(this.tasks[subtask])) {
        this.tasks[subtask].forEach((item) => {
          newTasks.push(item);
        });
      } else {
        newTasks.push(subtask);
      }
    });
    tasks = newTasks;
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
