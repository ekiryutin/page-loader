import Listr from 'listr';

// визуализация запросов к ресурсам
// вызывается из загрузчика

export default (tasks, forcedRun = false) => {
  if (process.env.DEBUG && !forcedRun) {
    // если включены debug-сообщения, то загрузка не отображается
    return;
  }
  const listr = new Listr(tasks, { concurent: true, exitOnError: false });
  listr.run();
};
