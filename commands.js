﻿var hashslot = require('./hashslot');
//function get(key, cb) {
//    var slot = hashslot(new Buffer(key));
//    //var slot = 12182;
//    var connection = this.getConnection(slot);
//    send('get', [key], cb, connection, slot);
//}

//function set(key, value, cb) {
//    var slot = hashslot(new Buffer(key));
//    var connection = this.getConnection(slot);
//    send('set', [key, value], cb, connection, slot);
//}

function sentinel(job, err, reply) {
    if (err) {
        if (err.indexOf('CLUSTERDOWN') === 0) {
            if (job.retryCount > 4) {
                job.guarded('ERROR: ERETRYCOUNTEXCEEDED: ' + err);
                return;
            }
            job.connection.queue.unshift(job);
            job.connection.close();
            job.connection.emit('error', new Error(err));
            return;
        }
        //TODO: handle -ASK and -MOVE
    }
    if (typeof job.guarded == 'function') {
        job.guarded(err, reply);
    }
}

function send(command, args, cb, connection, slot) {
    var length = args.length + 1;
    var content = "*" + length + '\r\n$' + command.length + '\r\n' + command + '\r\n';
    for (var i = 0; i < args.length; i++) {
        content += '$' + Buffer.byteLength(args[i]) + '\r\n' + args[i] + '\r\n';
    }
    var data = content;
    var job = {
        slot: slot,
        data : data,
        callback: function (err, reply) { sentinel(job, err, reply); },
        originalCommand: content,
        guarded: cb,
        retryCount: 0
    };
    if (!connection) {
        if (this.queue.length > 50000) { //TODO: make overflow configurable
            cb('ERROR: ECLUSTERQUEUEOVERFLOW');
        } else {
            this.queue.push(job);
        }
        return;
    }
    //console.log(connection.port);
    connection.write(job);
}
//module.exports.get = get;
//module.exports.set = set;

var NULL = null;
//TODO: implement these as functions
var zunionInterGetKeys;
var sortGetKeys;
var migrateGetKeys;
var evalGetKeys;

//from redis.c; {} => []
//struct redisCommand redisCommandTable[] = [
var redisCommandTable = [
    [ "get","getCommand",2,"rF",0,NULL,1,1,1,0,0],
    ["set","setCommand", - 3,"wm",0,NULL,1,1,1,0,0 ],
    ["setnx","setnxCommand",3,"wmF",0,NULL,1,1,1,0,0],
    ["setex","setexCommand",4,"wm",0,NULL,1,1,1,0,0],
    ["psetex","psetexCommand",4,"wm",0,NULL,1,1,1,0,0],
    ["append","appendCommand",3,"wm",0,NULL,1,1,1,0,0],
    ["strlen","strlenCommand",2,"rF",0,NULL,1,1,1,0,0],
    ["del","delCommand", - 2,"w",0,NULL,1, - 1,1,0,0 ],
    ["exists","existsCommand", - 2,"rF",0,NULL,1, - 1,1,0,0 ],
    ["setbit","setbitCommand",4,"wm",0,NULL,1,1,1,0,0],
    ["getbit","getbitCommand",3,"rF",0,NULL,1,1,1,0,0],
    ["setrange","setrangeCommand",4,"wm",0,NULL,1,1,1,0,0],
    ["getrange","getrangeCommand",4,"r",0,NULL,1,1,1,0,0],
    ["substr","getrangeCommand",4,"r",0,NULL,1,1,1,0,0],
    ["incr","incrCommand",2,"wmF",0,NULL,1,1,1,0,0],
    ["decr","decrCommand",2,"wmF",0,NULL,1,1,1,0,0],
    ["mget","mgetCommand", - 2,"r",0,NULL,1, - 1,1,0,0 ],
    ["rpush","rpushCommand", - 3,"wmF",0,NULL,1,1,1,0,0 ],
    ["lpush","lpushCommand", - 3,"wmF",0,NULL,1,1,1,0,0 ],
    ["rpushx","rpushxCommand",3,"wmF",0,NULL,1,1,1,0,0],
    ["lpushx","lpushxCommand",3,"wmF",0,NULL,1,1,1,0,0],
    ["linsert","linsertCommand",5,"wm",0,NULL,1,1,1,0,0],
    ["rpop","rpopCommand",2,"wF",0,NULL,1,1,1,0,0],
    ["lpop","lpopCommand",2,"wF",0,NULL,1,1,1,0,0],
    ["brpop","brpopCommand", - 3,"ws",0,NULL,1,1,1,0,0 ],
    ["brpoplpush","brpoplpushCommand",4,"wms",0,NULL,1,2,1,0,0],
    ["blpop","blpopCommand", - 3,"ws",0,NULL,1, - 2,1,0,0 ],
    ["llen","llenCommand",2,"rF",0,NULL,1,1,1,0,0],
    ["lindex","lindexCommand",3,"r",0,NULL,1,1,1,0,0],
    ["lset","lsetCommand",4,"wm",0,NULL,1,1,1,0,0],
    ["lrange","lrangeCommand",4,"r",0,NULL,1,1,1,0,0],
    ["ltrim","ltrimCommand",4,"w",0,NULL,1,1,1,0,0],
    ["lrem","lremCommand",4,"w",0,NULL,1,1,1,0,0],
    ["rpoplpush","rpoplpushCommand",3,"wm",0,NULL,1,2,1,0,0],
    ["sadd","saddCommand", - 3,"wmF",0,NULL,1,1,1,0,0 ],
    ["srem","sremCommand", - 3,"wF",0,NULL,1,1,1,0,0 ],
    ["smove","smoveCommand",4,"wF",0,NULL,1,2,1,0,0],
    ["sismember","sismemberCommand",3,"rF",0,NULL,1,1,1,0,0],
    ["scard","scardCommand",2,"rF",0,NULL,1,1,1,0,0],
    ["spop","spopCommand",2,"wRsF",0,NULL,1,1,1,0,0],
    ["srandmember","srandmemberCommand", - 2,"rR",0,NULL,1,1,1,0,0 ],
    ["sinter","sinterCommand", - 2,"rS",0,NULL,1, - 1,1,0,0 ],
    ["sinterstore","sinterstoreCommand", - 3,"wm",0,NULL,1, - 1,1,0,0 ],
    ["sunion","sunionCommand", - 2,"rS",0,NULL,1, - 1,1,0,0 ],
    ["sunionstore","sunionstoreCommand", - 3,"wm",0,NULL,1, - 1,1,0,0 ],
    ["sdiff","sdiffCommand", - 2,"rS",0,NULL,1, - 1,1,0,0 ],
    ["sdiffstore","sdiffstoreCommand", - 3,"wm",0,NULL,1, - 1,1,0,0 ],
    ["smembers","sinterCommand",2,"rS",0,NULL,1,1,1,0,0],
    ["sscan","sscanCommand", - 3,"rR",0,NULL,1,1,1,0,0 ],
    ["zadd","zaddCommand", - 4,"wmF",0,NULL,1,1,1,0,0 ],
    ["zincrby","zincrbyCommand",4,"wmF",0,NULL,1,1,1,0,0],
    ["zrem","zremCommand", - 3,"wF",0,NULL,1,1,1,0,0 ],
    ["zremrangebyscore","zremrangebyscoreCommand",4,"w",0,NULL,1,1,1,0,0],
    ["zremrangebyrank","zremrangebyrankCommand",4,"w",0,NULL,1,1,1,0,0],
    ["zremrangebylex","zremrangebylexCommand",4,"w",0,NULL,1,1,1,0,0],
    ["zunionstore","zunionstoreCommand", - 4,"wm",0,zunionInterGetKeys,0,0,0,0,0 ],
    ["zinterstore","zinterstoreCommand", - 4,"wm",0,zunionInterGetKeys,0,0,0,0,0 ],
    ["zrange","zrangeCommand", - 4,"r",0,NULL,1,1,1,0,0 ],
    ["zrangebyscore","zrangebyscoreCommand", - 4,"r",0,NULL,1,1,1,0,0 ],
    ["zrevrangebyscore","zrevrangebyscoreCommand", - 4,"r",0,NULL,1,1,1,0,0 ],
    ["zrangebylex","zrangebylexCommand", - 4,"r",0,NULL,1,1,1,0,0 ],
    ["zrevrangebylex","zrevrangebylexCommand", - 4,"r",0,NULL,1,1,1,0,0 ],
    ["zcount","zcountCommand",4,"rF",0,NULL,1,1,1,0,0],
    ["zlexcount","zlexcountCommand",4,"rF",0,NULL,1,1,1,0,0],
    ["zrevrange","zrevrangeCommand", - 4,"r",0,NULL,1,1,1,0,0 ],
    ["zcard","zcardCommand",2,"rF",0,NULL,1,1,1,0,0],
    ["zscore","zscoreCommand",3,"rF",0,NULL,1,1,1,0,0],
    ["zrank","zrankCommand",3,"rF",0,NULL,1,1,1,0,0],
    ["zrevrank","zrevrankCommand",3,"rF",0,NULL,1,1,1,0,0],
    ["zscan","zscanCommand", - 3,"rR",0,NULL,1,1,1,0,0 ],
    ["hset","hsetCommand",4,"wmF",0,NULL,1,1,1,0,0],
    ["hsetnx","hsetnxCommand",4,"wmF",0,NULL,1,1,1,0,0],
    ["hget","hgetCommand",3,"rF",0,NULL,1,1,1,0,0],
    ["hmset","hmsetCommand", - 4,"wm",0,NULL,1,1,1,0,0 ],
    ["hmget","hmgetCommand", - 3,"r",0,NULL,1,1,1,0,0 ],
    ["hincrby","hincrbyCommand",4,"wmF",0,NULL,1,1,1,0,0],
    ["hincrbyfloat","hincrbyfloatCommand",4,"wmF",0,NULL,1,1,1,0,0],
    ["hdel","hdelCommand", - 3,"wF",0,NULL,1,1,1,0,0 ],
    ["hlen","hlenCommand",2,"rF",0,NULL,1,1,1,0,0],
    ["hkeys","hkeysCommand",2,"rS",0,NULL,1,1,1,0,0],
    ["hvals","hvalsCommand",2,"rS",0,NULL,1,1,1,0,0],
    ["hgetall","hgetallCommand",2,"r",0,NULL,1,1,1,0,0],
    ["hexists","hexistsCommand",3,"rF",0,NULL,1,1,1,0,0],
    ["hscan","hscanCommand", - 3,"rR",0,NULL,1,1,1,0,0 ],
    ["incrby","incrbyCommand",3,"wmF",0,NULL,1,1,1,0,0],
    ["decrby","decrbyCommand",3,"wmF",0,NULL,1,1,1,0,0],
    ["incrbyfloat","incrbyfloatCommand",3,"wmF",0,NULL,1,1,1,0,0],
    ["getset","getsetCommand",3,"wm",0,NULL,1,1,1,0,0],
    ["mset","msetCommand", - 3,"wm",0,NULL,1, - 1,2,0,0 ],
    ["msetnx","msetnxCommand", - 3,"wm",0,NULL,1, - 1,2,0,0 ],
    ["randomkey","randomkeyCommand",1,"rR",0,NULL,0,0,0,0,0],
    ["select","selectCommand",2,"rlF",0,NULL,0,0,0,0,0],
    ["move","moveCommand",3,"wF",0,NULL,1,1,1,0,0],
    ["rename","renameCommand",3,"w",0,NULL,1,2,1,0,0],
    ["renamenx","renamenxCommand",3,"wF",0,NULL,1,2,1,0,0],
    ["expire","expireCommand",3,"wF",0,NULL,1,1,1,0,0],
    ["expireat","expireatCommand",3,"wF",0,NULL,1,1,1,0,0],
    ["pexpire","pexpireCommand",3,"wF",0,NULL,1,1,1,0,0],
    ["pexpireat","pexpireatCommand",3,"wF",0,NULL,1,1,1,0,0],
    ["keys","keysCommand",2,"rS",0,NULL,0,0,0,0,0],
    ["scan","scanCommand", - 2,"rR",0,NULL,0,0,0,0,0 ],
    ["dbsize","dbsizeCommand",1,"rF",0,NULL,0,0,0,0,0],
    ["auth","authCommand",2,"rsltF",0,NULL,0,0,0,0,0],
    ["ping","pingCommand", - 1,"rtF",0,NULL,0,0,0,0,0 ],
    ["echo","echoCommand",2,"rF",0,NULL,0,0,0,0,0],
    ["save","saveCommand",1,"ars",0,NULL,0,0,0,0,0],
    ["bgsave","bgsaveCommand",1,"ar",0,NULL,0,0,0,0,0],
    ["bgrewriteaof","bgrewriteaofCommand",1,"ar",0,NULL,0,0,0,0,0],
    ["shutdown","shutdownCommand", - 1,"arlt",0,NULL,0,0,0,0,0 ],
    ["lastsave","lastsaveCommand",1,"rRF",0,NULL,0,0,0,0,0],
    ["type","typeCommand",2,"rF",0,NULL,1,1,1,0,0],
    ["multi","multiCommand",1,"rsF",0,NULL,0,0,0,0,0],
    ["exec","execCommand",1,"sM",0,NULL,0,0,0,0,0],
    ["discard","discardCommand",1,"rsF",0,NULL,0,0,0,0,0],
    ["sync","syncCommand",1,"ars",0,NULL,0,0,0,0,0],
    ["psync","syncCommand",3,"ars",0,NULL,0,0,0,0,0],
    ["replconf","replconfCommand", - 1,"arslt",0,NULL,0,0,0,0,0 ],
    ["flushdb","flushdbCommand",1,"w",0,NULL,0,0,0,0,0],
    ["flushall","flushallCommand",1,"w",0,NULL,0,0,0,0,0],
    ["sort","sortCommand", - 2,"wm",0,sortGetKeys,1,1,1,0,0 ],
    ["info","infoCommand", - 1,"rlt",0,NULL,0,0,0,0,0 ],
    ["monitor","monitorCommand",1,"ars",0,NULL,0,0,0,0,0],
    ["ttl","ttlCommand",2,"rF",0,NULL,1,1,1,0,0],
    ["pttl","pttlCommand",2,"rF",0,NULL,1,1,1,0,0],
    ["persist","persistCommand",2,"wF",0,NULL,1,1,1,0,0],
    ["slaveof","slaveofCommand",3,"ast",0,NULL,0,0,0,0,0],
    ["role","roleCommand",1,"lst",0,NULL,0,0,0,0,0],
    ["debug","debugCommand", - 2,"as",0,NULL,0,0,0,0,0 ],
    ["config","configCommand", - 2,"art",0,NULL,0,0,0,0,0 ],
    ["subscribe","subscribeCommand", - 2,"rpslt",0,NULL,0,0,0,0,0 ],
    ["unsubscribe","unsubscribeCommand", - 1,"rpslt",0,NULL,0,0,0,0,0 ],
    ["psubscribe","psubscribeCommand", - 2,"rpslt",0,NULL,0,0,0,0,0 ],
    ["punsubscribe","punsubscribeCommand", - 1,"rpslt",0,NULL,0,0,0,0,0 ],
    ["publish","publishCommand",3,"pltrF",0,NULL,0,0,0,0,0],
    ["pubsub","pubsubCommand", - 2,"pltrR",0,NULL,0,0,0,0,0 ],
    ["watch","watchCommand", - 2,"rsF",0,NULL,1, - 1,1,0,0 ],
    ["unwatch","unwatchCommand",1,"rsF",0,NULL,0,0,0,0,0],
    ["cluster","clusterCommand", - 2,"ar",0,NULL,0,0,0,0,0 ],
    ["restore","restoreCommand", - 4,"wm",0,NULL,1,1,1,0,0 ],
    ["restore-asking","restoreCommand", - 4,"wmk",0,NULL,1,1,1,0,0 ],
    ["migrate","migrateCommand", - 6,"w",0,migrateGetKeys,0,0,0,0,0 ],
    ["asking","askingCommand",1,"r",0,NULL,0,0,0,0,0],
    ["readonly","readonlyCommand",1,"rF",0,NULL,0,0,0,0,0],
    ["readwrite","readwriteCommand",1,"rF",0,NULL,0,0,0,0,0],
    ["dump","dumpCommand",2,"r",0,NULL,1,1,1,0,0],
    ["object","objectCommand",3,"r",0,NULL,2,2,2,0,0],
    ["client","clientCommand", - 2,"rs",0,NULL,0,0,0,0,0 ],
    ["eval","evalCommand", - 3,"s",0,evalGetKeys,0,0,0,0,0 ],
    ["evalsha","evalShaCommand", - 3,"s",0,evalGetKeys,0,0,0,0,0 ],
    ["slowlog","slowlogCommand", - 2,"r",0,NULL,0,0,0,0,0 ],
    ["script","scriptCommand", - 2,"rs",0,NULL,0,0,0,0,0 ],
    ["time","timeCommand",1,"rRF",0,NULL,0,0,0,0,0],
    ["bitop","bitopCommand", - 4,"wm",0,NULL,2, - 1,1,0,0 ],
    ["bitcount","bitcountCommand", - 2,"r",0,NULL,1,1,1,0,0 ],
    ["bitpos","bitposCommand", - 3,"r",0,NULL,1,1,1,0,0 ],
    ["wait","waitCommand",3,"rs",0,NULL,0,0,0,0,0],
    ["command","commandCommand",0,"rlt",0,NULL,0,0,0,0,0],
    ["pfselftest","pfselftestCommand",1,"r",0,NULL,0,0,0,0,0],
    ["pfadd","pfaddCommand", - 2,"wmF",0,NULL,1,1,1,0,0 ],
    ["pfcount","pfcountCommand", - 2,"r",0,NULL,1, - 1,1,0,0 ],
    ["pfmerge","pfmergeCommand", - 2,"wm",0,NULL,1, - 1,1,0,0 ],
    ["pfdebug","pfdebugCommand", - 3,"w",0,NULL,0,0,0,0,0 ],
    ["latency","latencyCommand", - 2,"arslt",0,NULL,0,0,0,0,0 ]
];

//TODO: do we need implementing multi key hashing to short circuit CROSSSLOT errors?
redisCommandTable.forEach(function (commandStruct) {
    var command = commandStruct[0];
    if (module.exports[command]) return;
    module.exports[command] = function (args, cb) {
        var realArgs = args;
        if (!(Array.isArray(args) && typeof cb === 'function')) {
            realArgs = [];
            Array.prototype.push.apply(realArgs, arguments);
            if (typeof realArgs[realArgs.length - 1] === 'function') {
                cb = realArgs.pop();
            }
        };
        var slot;
        if (commandStruct[6] != 0) {
            slot = hashslot(new Buffer(realArgs[commandStruct[6] - 1]));
        }
        var connection = this.getConnection(slot);
        send.call(this, command, realArgs, cb, connection, slot);
    };
});