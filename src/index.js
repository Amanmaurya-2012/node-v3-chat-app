const path = require('path') // core node module no need to install
const http = require('http')
const express = require('express') // need npm i express
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } =  require('./utils/messages')
const { adddUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')


const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath)) // serve up the publicDirectoryPath
 
io.on('connection', (socket) => {
    console.log('New web socket connection')

    socket.on('join', ( options , callback) => {
        const { error, user } = adddUser({ id: socket.id , ...options})

        if(error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', 'Welcome!')) // send to particular
        socket.broadcast.to(user.room).emit('message', generateMessage( 'Admin', `${user.username} has joined!`)) // send to everyone except itself

        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()

        // socket.emit, io.emit, socket.broadcast.emit
        // io.to.emit, socket.broadcast.to.emit
    })

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)
        const filter = new Filter()

        if(filter.isProfane(message)){
            return callback('Profanity is not allowed!')
        }

        io.to(user.room).emit('message',generateMessage(user.username, message)) // send to every one
        callback() 
    })

    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage( user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`)) 
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
}) 

// ()=> callback function
server.listen(port, ()=> {
    console.log(`Server is up on port ${port}!`)
}) // to start the server up


// served index.html on port 3000
// web socket protocol - allow full duplex communication