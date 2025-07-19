const express = require('express')
const path = require('path')

const app = express()
app.use(express.static(path.join(__dirname)))

const port = process.env.PORT || 8092
app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})
