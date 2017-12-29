'use strict';
const tap = require('tap');
const RunTask = require('../');

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

tap.test('setup', (t) => {
  t.plan(3);
  t.equal(typeof RunTask.constructor, 'function', 'RunTask is a class');
  const runner = new RunTask();
  t.equal(typeof runner.register, 'function', 'register is a function');
  t.equal(typeof runner.run, 'function', 'run is a function');
});

tap.test('runs basic fn', (t) => {
  t.plan(2);
  const runner = new RunTask();
  runner.register('test', (data) => {
    t.pass('fn is called');
  });
  runner.run('test');
  t.pass('run callback is called');
});

tap.test('run callback not required', (t) => {
  t.plan(1);
  const runner = new RunTask();
  runner.register('test', (data) => {
    t.pass('fn is called');
  });
  runner.run(['test']);
});

tap.test('can pass in string to run', (t) => {
  t.plan(1);
  const runner = new RunTask();
  runner.register('test', (data) => {
    t.pass('fn is called');
  });
  runner.run('test');
});

tap.test('runs in series', (t) => {
  t.plan(2);
  const runner = new RunTask();
  let count = 0;
  runner.register('test1', (data) => {
    t.equal(count, 0, 'test1 is called first');
    count++;
  });
  runner.register('test2', (data) => {
    t.equal(count, 1, 'test2 is called second');
  });

  runner.run(['test1', 'test2']);
});

tap.test('runs in series and parallel', (t) => {
  t.plan(2);
  const runner = new RunTask();
  let count = 0;
  runner.register('test1', async (data) => {
    await wait(1000);
    t.equal(count, 1, 'test1 is called');
  });
  runner.register('test2', (data) => {
    t.equal(count, 0, 'test2 is called');
    count++;
  });

  runner.run([['test1', 'test2']]);
});

tap.test('nested parallel tasks', async(t) => {
  t.plan(1);
  const runner = new RunTask();
  let count = 0;
  runner.register('test', (data) => {
    count++;
  });
  await runner.run([[['test', 'test'], 'test']]);
  t.equal(count, 3, 'test ran 3 times');
});

tap.test('error if running task that doesnt exist', async(t) => {
  t.plan(1);
  const runner = new RunTask();
  try {
    await runner.run('hi');
  } catch (e) {
    t.ok(e instanceof Error);
  }
});

tap.test('run class with execute function', (t) => {
  t.plan(1);
  class Test {
    execute(data) {
      t.pass('class.execute is called');
    }
  }
  const runner = new RunTask();
  runner.register('test', new Test().execute);
  runner.run('test');
});

tap.test('be able to set array of tasks', (t) => {
  t.plan(2);
  const runner = new RunTask();
  runner.register('test1', (data) => {
    t.pass('test1 called');
  });
  runner.register('test2', (data) => {
    t.pass('test2 called');
  });
  runner.register('test', ['test1', 'test2']);
  runner.run('test');
});

tap.test('if you pass in a task alias, then make sure first array is run in series', (t) => {
  t.plan(4);
  const runner = new RunTask();
  let count = 0;
  runner.register('test1', async(data) => {
    await wait(2000);
    t.equal(count, 0, 'test1 ran first');
    count++;
    t.pass('test1 called');
  });
  runner.register('test2', (data) => {
    t.equal(count, 1, 'test1 ran first');
    t.pass('test2 called');
  });
  runner.register('test', ['test1', 'test2']);
  runner.run('test');
});

tap.test('complex alias example', (t) => {
  t.plan(5);
  const runner = new RunTask();
  let count = 0;

  runner.register('series1', async(data) => {
    await wait(5);
    t.equal(count, 0, 'series 1 ran first');
    count++;
  });

  runner.register('parallel1', async(data) => {
    await wait(100);
    t.equal(count, 3, 'parallel tasks returns after parallels2 & 3 done');
    count++;
  });

  runner.register('parallel2', async(data) => {
    await wait(1);
    t.equal(count, 1, 'parallel2 tasks returns after series1');
    count++;
  });

  runner.register('parallel3', async(data) => {
    await wait(50);
    t.equal(count, 2, 'parallel3 tasks returns after parallel2');
    count++;
  });

  runner.register('series2', async(data) => {
    await wait(1);
    t.equal(count, 4, 'series2 ran after all parallel finished');
    count++;
  });

  runner.register('complex', [
    'series1', ['parallel1', 'parallel2', 'parallel3'], 'series2'
  ]);
  runner.run('complex');
});

tap.test('nested alias', (t) => {
  t.plan(4);
  const runner = new RunTask();
  let count = 0;

  runner.register('series1', async(data) => {
    await wait(10);
    t.equal(count, 0, 'series 1 ran first');
    count++;
  });

  runner.register('parallel1', async(data) => {
    await wait(100);
    t.equal(count, 2, 'parallel1 task returns after series1 and parallel2');
    count++;
  });

  runner.register('parallel2', async(data) => {
    await wait(1);
    t.equal(count, 1, 'parallel2 tasks returns after series 1 and before parallel1');
    count++;
  });

  runner.register('series2', async(data) => {
    await wait(1);
    t.equal(count, 3, 'series2 ran after all parallel finished');
    count++;
  });
  runner.register('alias1', ['series1', ['parallel1', 'parallel2']]);
  runner.register('nested', ['alias1', 'series2']);
  runner.run('nested');
});

tap.test('bind to ', (t) => {
  t.plan(1);
  const runner = new RunTask({ bind: { blah: '123' } });
  function func () {
    t.equal(this.blah, '123');
  }
  runner.register('test', func);
  runner.run('test');
});

tap.test('onStart and onFinish', (t) => {
  t.plan(4);
  let count = 0;
  const runner = new RunTask({
    onStart: (name) => {
      count++;
      t.equal(name, 'thing', 'task is name');
    },
    onFinish: (name) => {
      t.equal(name, 'thing', 'task is name');
      t.equal(count, 2, 'onFinish called second');
    }
  });
  runner.register('thing', (data) => {
    t.equal(count, 1, 'onStart was called first');
    count++;
  });
  runner.run('thing');
});

tap.test('onStart and onFinish for classes', (t) => {
  t.plan(4);
  let count = 0;
  const runner = new RunTask({
    onStart: (name) => {
      count++;
      t.equal(name, 'test', 'name is test');
    },
    onFinish: (name) => {
      t.equal(name, 'test', 'name is test');
      t.equal(count, 2, 'onFinish called second');
    }
  });
  class Test {
    execute(data) {
      t.equal(count, 1, 'onStart was called first');
      count++;
    }
  }
  runner.register('test', new Test().execute);
  runner.run('test');
});

tap.test('data is passed to onStart', (t) => {
  t.plan(1);
  const runner = new RunTask({
    onStart: (name, data) => {
      t.equal(data, 1);
    },
  });
  class Test {
    execute(data) {
      return data;
    }
  }
  runner.register('test', new Test().execute);
  runner.run('test', 1);
});

tap.test('data and result is passed to onFinish', (t) => {
  t.plan(2);
  const runner = new RunTask({
    onFinish: (name, data, result) => {
      t.equal(data, 1);
      t.equal(result, 2);
    }
  });
  class Test {
    execute(data) {
      return data + 1;
    }
  }
  runner.register('test', new Test().execute);
  runner.run('test', 1);
});

tap.test('function will take in data options', (t) => {
  t.plan(1);
  const runner = new RunTask();
  runner.register('test', (data) => {
    t.equal(data.data1, 'yes', 'data is passed');
  });
  runner.run('test', { data1: 'yes' });
});

tap.test('run class with execute function will take in data options', (t) => {
  t.plan(1);
  class Test {
    execute(data) {
      t.equal(data.data1, 'yes', 'data is passed to class');
    }
  }
  const runner = new RunTask();
  runner.register('test', new Test().execute);
  runner.run('test', { data1: 'yes' });
});
