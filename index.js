const express = require('express');
const app = express();
const http = require('http').createServer(app)
const io = require('socket.io')(http)
const fs = require('fs')
const path = require('path')
var ss = require('socket.io-stream');

let userIds = []
let userMap = new Map()
app.use(express.json());
app.use('/images', express.static(__dirname + '/Images'));
app.get('/', (req, res)=>{
    res.sendFile(__dirname + '/index.html');
})
app.get('/imagenames',(req,res)=>{
  try{
  const directoryPath = path.join(__dirname, 'Images');
  const files = fs.readdirSync(directoryPath);
  res.status(200).send(files)
  console.log(files)
  } catch(error) {
    res.status(500).send({error})
  }

})

app.get('/availabledevices',(req,res)=>{
  let names =[]
  userMap.forEach((value,key,map)=>{
    if(value.deviceType==='display')
    names.push(value.deviceName)
  })
  res.send(names)
})

app.get('/admin', (req, res)=>{
    res.sendFile(__dirname + '/admin.html');
})

app.post('/pushcontent', (req,res) => {
  const {imageUrl, deviceNames} = req.body
  let imageName = imageUrl.split("/images/")[1]
  let data = {
    name:imageName
  }
  userMap.forEach((value,key,map)=>{
    if(deviceNames.indexOf(value.deviceName)>-1){
      io.to(`${key}`).emit('newContent', data)
    }
  })
  res.status(200).send({"message":"success"})

})

app.get('/join',(req, res)=>{
  console.log('request', req.query)
  userMap.set(req.query.socketId,{
    deviceName: req.query.deviceName,
    deviceType: req.query.deviceType, 
    socketId: req.query.socketId
  })
  console.log(userMap)
  res.status(200).send({message:"success"})
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
    io.emit('users-updated', userIds)

    // for disconnection
    socket.on('disconnect', function(){
        console.log('user disconnected');
        
        let indexOfUserLeaving = userIds.indexOf(socket.id)
        userIds.splice(indexOfUserLeaving, 1)
        console.log('updated UserIds',userIds)
        io.emit('users-updated', userIds)
        userMap.delete(socket.id)
        console.log(userMap)

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