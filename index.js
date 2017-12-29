'use strict';

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

  async runOne(task, data) {
    const onStart = this.onStart;
    const onFinish = this.onFinish;
    if (Array.isArray(task)) {
      // run each in order:
      return task.forEach(async (taskItem) => {
        await this.runOne(taskItem, data);
      });
    }
    let fn = this.tasks[task];
    if (Array.isArray(fn)) {
      return this.runOne(fn, data);
    }
    if (!fn) {
      throw new Error(`${task} does not exist`);
    }
    if (this.options.bind) {
      fn = fn.bind(this.options.bind);
    }
    onStart(task, data);
    const result = await fn(data);
    onFinish(task, data, result);
    return result;
  }

  async run(tasks, data) {
    // data param is optional:
    if (!data) {
      data = {};
    }
    // a string can be either the name of a single task function or class
    // or the name of a list of task functions / classes
    if (typeof tasks === 'string') {
      // if the string maps on to a list of tasks,
      // treat that list as the intended top-level item:
      if (this.tasks[tasks] && Array.isArray(this.tasks[tasks])) {
        return this.run(this.tasks[tasks]);
      }
      // otherwise cast it as a list and continue:
      tasks = [tasks];
    }
    // if the top-level is a list of tasks, and any of those subtasks is a string referring to a list of tasks
    // that sub-list needs to be merged into the top-level list:
    const newTasks = [];
    if (!tasks) {
      throw new Error(`${tasks} does not exist`);
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
    // these actually are meant to run in a series, so 'await' each one
    /* eslint-disable no-await-in-loop */
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      await this.runOne(task, data);
    }
    /* eslint-enable no-await-in-loop */
  }
}

module.exports = RunTask;
