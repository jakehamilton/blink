const express = require('express')
const app = express()

app.use('/project/blink', express.static('app'))

app.listen(8080)