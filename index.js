const app = require('express')();
const http = require('http').createServer(app)
const io = require('socket.io')(http)
const fs = require('fs')
const path = require('path')
var ss = require('socket.io-stream');

let userIds = []

app.get('/', (req, res)=>{
    res.sendFile(__dirname + '/index.html');
})

app.get('/admin', (req, res)=>{
    res.sendFile(__dirname + '/admin.html');
})

app.get('/video', function(req, res) {
    const path = 'vid.mp4'
    const stat = fs.statSync(path)
    const fileSize = stat.size
    const range = req.headers.range
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-")
      const start = parseInt(parts[0], 10)
      const end = parts[1] 
        ? parseInt(parts[1], 10)
        : fileSize-1
      const chunksize = (end-start)+1
      const file = fs.createReadStream(path, {start, end})
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      }
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      }
      res.writeHead(200, head)
      fs.createReadStream(path).pipe(res)
    }
  });

io.on('connection',(socket) => {
    console.log('user connected', socket.id)
    userIds.push(socket.id)
    console.log('updated UserIds',userIds)
    socket.emit('users-updated', userIds)
    sendImage(socket, './scene.jpeg')
    setTimeout(() => {
        sendImage(socket, './thumbs.png')
    }, 5000);
    sendVideo(socket,'./vid.mp4')
    


    // for disconnection
    socket.on('disconnect', function(){
        console.log('user disconnected');
        let indexOfUserLeaving = userIds.indexOf(socket.id)
        userIds = userIds.splice(indexOfUserLeaving, 1)
        console.log('updated UserIds',userIds)
        socket.emit('users-updated', userIds)

      });
})

const sendImage = (socket, name) => {
    let readStream = fs.createReadStream(path.resolve(__dirname, name),{
        encoding: 'binary'
    })
    
    readStream.on('readable', () => {
        console.log('readable')
        let chunk;
        while (null !== (chunk = readStream.read())) {
            console.log(`Received ${chunk.length} bytes of data.`);
            socket.emit('img-chunk',chunk)
        }
        // var buff = readStream.read(21703); //Read first 8 bytes only once
        // console.log(buff.toString());
    })
    readStream.on('open', () => {
        console.log("file opened");

    })
    // readStream.on('data', function(chunk) {
    //     console.log('data reading')
        
    // })

    readStream.on('end',()=> {
        console.log('image reading done')
        socket.emit('img-sending-complete')
    })
    readStream.on('error', (err) => {
        console.log(err);
    })
}
const sendVideo = (socket, name) => {
    let readStream = fs.createReadStream(path.resolve(__dirname, name),{
        encoding: 'binary'
    })
    
    readStream.on('readable', () => {
        console.log('readable')
        let chunk;
        while (null !== (chunk = readStream.read())) {
            console.log(`Received ${chunk.length} bytes of data.`);
            socket.emit('video-chunk',chunk)
            
        }
        // var buff = readStream.read(21703); //Read first 8 bytes only once
        // console.log(buff.toString());
    })
    readStream.on('open', () => {
        console.log("file opened");

    })
    // readStream.on('data', function(chunk) {
    //     console.log('data reading')
        
    // })

    readStream.on('end',()=> {
        console.log('reading done')
        socket.emit('video-sending-complete')
    })
    readStream.on('error', (err) => {
        console.log(err);
    })
}
const port = 3000

http.listen(port, ()=>{
    console.log(`listing on port ${port}`)
})