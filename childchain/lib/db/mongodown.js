const MongoClient = require('mongodb').MongoClient;

const url = process.env.MONGODB_URI || 'mongodb://localhost:27017/chamber';

function MongoDown(location) {
  this.location = location;
  this.status = 'new';
}

MongoDown.prototype.open = function (options, callback) {
  if(callback === undefined) {
    callback = options;
  }
  MongoClient.connect(url, {useNewUrlParser: true}, (err, client) => {
    if(err) {
      console.log('mongodb open error', err);
      return callback(err);
    }
    this.status = 'opening';
    this.db = client.db();
    callback(null);
  });
}

MongoDown.prototype.close = function (callback) {
  this.db.close(callback);
}

MongoDown.prototype.put = function (key, value, options, callback) {
  if(callback === undefined) {
    callback = options;
  }
  this.db.collection(this.location).updateOne({
    _id: key
  }, {
    $set: {
      value: value
    }
  }, callback);
}

MongoDown.prototype.get = function (key, options, callback) {
  if(callback === undefined) {
    callback = options;
  }
  this.db.collection(this.location).findOne({
    _id: key
  }, (err, doc) => {
    if(doc == null) {
      const error = new Error('key not found');
      error.notFound = true;
      callback(error);
    } else {
      callback(err, doc);
    }
  });
}

MongoDown.prototype.del = function (key, options, callback) {
  if(callback === undefined) {
    callback = options;
  }
  this.db.collection(this.location).deleteOne({_id: key}, callback);
}


module.exports = MongoDown;
