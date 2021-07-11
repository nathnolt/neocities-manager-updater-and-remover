var fs = require('fs')
var path = require('path')
var neocities = require('neocities')
try {
	var config = require('./config.js')
} catch(err) {
	console.log('You need to add a onfig.js file')
	process.exit(1)
}
var siteFolder = './public'




var myArgs = process.argv.slice(2)
if(myArgs[0] == 'upload') {
	uploadAll()
} else if(myArgs[0] == 'delete') {
	deleteAll()
} else {
	console.error('add either argument upload or argument delete')
	process.exit(1)
}




// Upload all files within siteFolder
function uploadAll() {
	// 1. let's get a list of all the files that the user has.
	var allFiles = getFiles(siteFolder, gottenAllFiles)
	
	var gottenFiles = 0
	function gottenAllFiles(allFiles) {
		gottenFiles += 1
		if(gottenFiles > 1) {
			console.error('gotten all files was called multiple times, RIP')
			return
		}
		
		// strip the site folder
		for(var i=0; i<allFiles.length; i++) {
			var file = allFiles[i]
			file.stripped = stripBegin(file, siteFolder)
		}
		
		uploadFiles(allFiles)
	}
	
	function uploadFiles(allFiles) {
		var api = new neocities(config.username, config.password)
		
		var uploadApiArr = []
		for(var i=0; i<allFiles.length; i++) {
			var file = allFiles[i]
			if(file.isDir){continue} // skip folders
			uploadApiArr.push({name: file.stripped, path: file.fullPath})
		}
		
		// Upload the files.
		api.upload(uploadApiArr, function(resp) {
			console.log(resp)
		})
	}
}

// delete all files from the neocities account.
function deleteAll() {
	var api = new neocities(config.username, config.password)
	
	// get the list of files on the api
	var fileList = []
	api.get('list', false, function(data) {
		if(data.result != 'success') {
			console.error('data not succes but instead ' + data.result)
			console.error(data)
			return
		}
		
		for(var i=0; i < data.files.length; i++) {
			var file = data.files[i]
			if(file.path == 'index.html'){continue} // index.html will not be removed anyway, so we can skip it.
			fileList.push(file.path)
		}
		
		deleteFiles()
	})
	
	// delete the files
	function deleteFiles() {
		api.delete(fileList, function(resp) {
		  console.log(resp)
		})
	}
}





// strips a beginning path from a file
function stripBegin(file, folder) {
	var index = file.fullPath.indexOf(folder)
	if(index != 0) {
		console.error('failed')
	}
	return file.fullPath.slice(folder.length + 1)
}


function getFiles(folderPath, cb, ctx) {
	if(ctx == undefined) {
		ctx = {
			files: [],
			todo: 0,
			done: 0,
			waiting: false,
		}
	}
	
	function readResult(err, items) {
		ctx.waiting = false // this will probably not work for large and complex folder structures, but it works for my example.
		if(err != null) {
			console.error(err)
			return
		}
		
		if(items.length == 0) {
			if(ctx.done == ctx.todo) {
				cb(ctx.files)
			}
		}
		
		function itemStatResult(err, stats) {
			if(err != null) {
				console.error(err)
				return
			}
			
			ctx.done += 1
			
			if(stats.isDirectory()) {
				this.file.isDir = true
				ctx.waiting = true
				getFiles(this.file.fullPath, cb, ctx)
			} else {
				if(ctx.waiting == false && ctx.done == ctx.todo) {
					cb(ctx.files)
				}
			}
		}
		
		ctx.todo += items.length
		
		for(var i = 0; i < items.length; i++) {
			var item = items[i]
			var fullPath = folderPath + '/' + item
			var file = {folder: folderPath, item: item, fullPath: fullPath}
			ctx.files.push(file)
			fs.stat(fullPath, itemStatResult.bind({file: file}))
		}
	}
	fs.readdir(folderPath, readResult)
}
