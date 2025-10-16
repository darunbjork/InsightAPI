const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {
  const mongod = await MongoMemoryServer.create();
  global.__MONGO_URI__ = mongod.getUri();
  global.__MONGOD__ = mongod;
};
