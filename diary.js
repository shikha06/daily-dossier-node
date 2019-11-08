var express = require('express');
var crypto = require('crypto');
var mongodb = require('mongodb');
var bodyParser = require('body-parser');
var session = require('express-session');
var currentDate = new Date();

var app = express();

const url = 'mongodb://localhost:27017/diary';

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    secret: 'pikachu',
    resave: true,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000*60*60
    }
}));

var getHashed = (pass, email) => {
    
    var hmac = crypto.createHmac('sha512', email);
    var data = hmac.update(pass);
    var hashed = data.digest('hex');

    console.log('Data after hashing is : ' + hashed);

    return hashed;
}

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/login.html');
});

app.get('/entry', (req, res) => {

    if(req.session.email){
        return res.sendFile(__dirname + '/public/insert.html');
    }
    
    res.sendFile(__dirname + '/public/login.html');
});

app.get('/delete', (req, res) => {

    if(req.session.email){
        return res.sendFile(__dirname + '/public/delete.html');
    }
    
    res.sendFile(__dirname + '/public/login.html');
});

app.get('/logout', (req, res) => {

    req.session.destroy();

    res.status(200).json({
        message: 'Sucessfully logged out...!!!'
    });
});

app.get('/signup', (req, res) => {
    res.sendFile(__dirname + '/public/signup.html');
});

app.get('/read', (req, res) => {

    if(!req.session.email) {
        return res.sendFile(__dirname + '/public/login.html');
    }
    
    mongodb.connect(url, (err, db) => {

        if(err) throw err;

        console.log('connected to database...');
        var dbname = db.db('diary');
        dbname.collection(req.session.collection).find().toArray((err, result) => {

            if(err) throw err;
            console.log(result);

            res.status(200).json(result);
        });
    })
});

app.post('/signup', (req, res) => {

    var pass = req.body.password;
    var email = req.body.email;
    
    var password = getHashed(pass, email);

    data = {
        name: req.body.name,
        password: password,
        phone: req.body.phone,
        email: email
    }

    mongodb.connect(url, (err, db) => {

        if(err) throw err;

        console.log('Database connected..');
        var dbname = db.db('diary');
        dbname.collection('users').insertOne(data, (err, result) => {

            if(err) throw err;

            console.log('Data insereted successfully...');
            res.status(200).json({
                message: 'Successfully signed in...'
            });
        });
    });
});

app.post('/login', (req, res) => {

    var email = req.body.email;
    var pass = req.body.password;

    data = {
        email: email
    }

    mongodb.connect(url, (err, db) => {

        if(err) throw err;

        console.log('Database connected...');
        var dbname = db.db('diary');
        dbname.collection('users').findOne(data, (err, result) => {

            if(err) throw err;

            if(result == null){
                res.status(401).json({
                    message: 'Unauthenticated user for access'
                });
            }

            else{
                var password = getHashed(pass, result.email);
                if(password != result.password){
                    res.status(401).json({
                        message: 'Unauthenticated user for access'
                    });
                }
                else{
                    req.session.email = email;
                    req.session.collection = result.name;
                    res.sendFile(__dirname + '/public/landing.html');
                }
            }
        });
    });
});

app.post('/entry', (req, res) => {

    var content = req.body.content;
    var date = currentDate.getDate() + '/' + (currentDate.getMonth() + 1) + '/' + currentDate.getFullYear();

    console.log(req.session.collection);
    mongodb.connect(url, (err, db) => {

        if(err) throw err;

        console.log('connected...');
        var dbname = db.db('diary');
        dbname.collection(req.session.collection).findOne({date: date}, (err, result) => {

            if(err) throw err;

            if(result == null) {
                data = {
                    date: currentDate.getDate() + '/' + (currentDate.getMonth() + 1) + '/' + currentDate.getFullYear(),
                    time: currentDate.getHours() + ':' + currentDate.getMinutes() + ':' + currentDate.getSeconds(),
                    content: content
                }
                dbname.collection(req.session.collection).insertOne(data, (err, result) => {

                    if(err) throw err;

                    console.log('Data inserted...');
                    res.end('data inserted...');
                });
            }
            else{
                data = {
                    date: currentDate.getDate() + '/' + (currentDate.getMonth() + 1) + '/' + currentDate.getFullYear(),
                    time: currentDate.getHours() + ':' + currentDate.getMinutes() + ':' + currentDate.getSeconds(),
                    content: result.content + ' ' + content
                }
                dbname.collection(req.session.collection).updateOne({date: data.date}, {$set: data}, (err, result) => {

                    if(err) throw err;

                    console.log('Data updated...');
                    res.end('data updated...');
                });
            }
        })
    })

    

    
});

app.post('/delete', (req, res) => {

    var date = req.body.date;

    var new_date = date.split('-');

    console.log(new_date[1]);

    var quo = Math.floor(new_date[1]/10);
    console.log(quo);
    if(quo == 0) {
        new_date[1] = (new_date[1]/10)*10;
    }

    var quo2 = Math.floor(new_date[2]/10);
    console.log(quo2);
    if(quo2 == 0) {
        new_date[2] = (new_date[2]/10)*10;
    }

    var compare = new_date[2] + '/' + new_date[1] + '/' + new_date[0];
    console.log(compare);

    mongodb.connect(url, (err, db) => {

        if(err) throw err;

        console.log('Database connected...');
        var dbname = db.db('diary');
        dbname.collection(req.session.collection).deleteOne({date: compare}, (err, result) => {

            if(err) throw err;

            console.log('Deleted successfully...');
            res.end('Done');
        });

    });
});


app.listen(3000, () => {
    console.log('Listening on port 3000..!!!');
});