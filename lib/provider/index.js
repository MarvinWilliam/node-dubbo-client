const Config = require('./config');
const Invoker = require('./invoker');
const Server = require('./server');
const Log = require('./providerLog');
const Registry = require('./registry');

let servicesMap = new Map();

exports.init = (options) => {
  Config.setOptions(options);
  const registry = Config.getRegistry();
  return Registry.init(registry.url, registry.options);
};

exports.setLog = (log) => Log.setLog(log, Config.getOptions().debug);

exports.addProvider = ({ serviceName, version, group, port = Config.getPort(), methods }) => {
  if (port === undefined) {
    throw new Error('Port is not defined.');
  }

  let description = Invoker.getDescription({ serviceName, version, group });

  if (servicesMap.has(description)) {
    Log.info(`service has been created.${description}`);
    return Promise.resolve();
  } else {
    let invoker = new Invoker({ serviceName, version, group, methods, port });
    return Server
      .listen({ port, invoker })
      .then(() => Registry.register(invoker))
      .then(() => servicesMap.set(invoker.toString(), invoker));
  }
};

/**
 * 销毁provider
 * 先删除zookeeper上注册的节点,然后再关闭服务器.
 */
exports.dispose = () =>
  Registry
    .dispose([...servicesMap.values()])
    .then(() => {
      servicesMap.clear();
      return Server.close();
    });