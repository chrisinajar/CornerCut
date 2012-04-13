/*
 * CornerCut
 * Dead simple web routing using modules.
 * Author: Chris "inajar" Vickery <chrisinajar@gmail.com>
 *
 * Redistribution and use in source, minified, binary, or any other forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 */

var http = require("http");

var CornerCut = function() {
	var self = this;

	self.routes = [];

	self.errorHandlers = {};
	self.webserver = null;

	self.add = (function(route) {
		if (route instanceof Array) {
			self.routes = self.routes.concat(route);
		} else
			self.routes.push(route);
		
		return self;
	});

	// Create a web server, listen, and assign the this's router to it...
	// Strictly for convenience sake, you can use your own web server if you want :)
	self.createServer = (function(port, address) {
		if (!port)
			port = 80;
		if (!address)
			address = '0.0.0.0';
		
		var router = self.getRouter();
		
		self.webserver = http.createServer(function (req, res) {
			router(req, res);
		}).listen(port, address);
		
		return self.webserver;
	});
	
	// Returns a function that can be used to handle requests.
	// these may be chained together or used in anything
	self.getRouter = (function() {
		return (function(req, res) {
			var routes = self.routes,
				url = require('url').parse(req.url, true),
				route = null;

			// find that route!
			for (var i = 0, l = routes.length; i < l; ++i) {
				var r = routes[i];
				if (r.path === url.pathname) {
					route = r;
					break;
				}
			}
			
			if (route === null) {
				res.writeHead(404, {
					'Content-Type': 'text/html'
				});
				
				if ("404" in self.errorHandlers) {
					return self.errorHandlers["404"](req, res, self);
				} else {
					return res.end("404\n<br />Not found!");
				}
			}
			
			var target = route.target;
			var fn = null;
			var data = null;
			if (route.data) {
				data = route.data;
				data.self = self;
			} else {
				data = {self:self};
			}
			
			// figure out which function to use
			if ("methodParam" in route) {
				fn = url.query[route.methodParam];
				if (!fn) {
					res.writeHead(500, {
						'Content-Type': 'text/html'
					});
					return res.end('Missing required parameter, ' + route.methodParam);
				}
			} else {
				fn = (route.method ? route.method : null);
			}

			if (typeof target === 'string') {
				try {
					target = require(target);
				} catch (ex) {
					res.writeHead(500, {
						'Content-Type': 'text/html'
					});
					return res.end('Could not find module by the name, ' + target);
				}
			} else if (typeof target === 'function') {
				target = target();
			}

			if ("httpCode" in route) {
				var code = route.httpCode,
					headers = route.headers;
				if (headers)
					res.writeHead(code, headers);
				else
					res.writeHead(code, {'Content-Type': 'text/html'});
			}
			
			// Do it!
			try {
				if (target) {
					if (fn)
						target[fn](req, res, data);
					else
						target(req, res, data);
				} else {
					if (fn)
						fn(req, res, data);
					else {
						res.writeHead(404, {
							'Content-Type': 'text/html'
						});
						
						if ("404" in self.errorHandlers) {
							return self.errorHandlers["404"](req, res, data);
						} else {
							return res.end("404\n<br />Not found!");
						}
					}
				}
			} catch (ex) {
				console.log("Failure!", ex);
				
					res.writeHead(500, {
						'Content-Type': 'text/html'
					});
					return res.end(ex.toString());
			}
			
		});
	});
};

module.exports = CornerCut;


