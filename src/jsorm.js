/**
 * @fileoverview
 * Utilities necessary for JSORM. These are used by the various other libraries.
 * 
 */
/*global JSORM, java, window, document */
//set up the base namespace object and version
(function(exports) {
	exports.version = "@@version@@";

	// we need to extend our array

	// signify that this is an array
	Array.prototype.isArray = true;
	// add multiple elements to an array
	Array.prototype.pushAll = function(a) {
		a = [].concat(a);
		Array.prototype.push.apply(this,a);
	};
	// insert elements at a particular place in an array
	Array.prototype.insert = function(i,elm) {
		Array.prototype.splice.apply(this,[].concat(i,0,elm));
	};
	// empty an array
	Array.prototype.clear = function() {
		Array.prototype.splice.apply(this,[0]);
	};
	// replace all of the contents of an array
	Array.prototype.replace = function(elm) {
		this.clear();
		this.pushAll(elm);
	};
	// convert the array to a hash. This makes it easier for multiple lookups
	Array.prototype.hasher = function() {
		var i, len, h = {};
		for (i=0, len=this.length; i<len; i++) {
			h[this[i]] = i;
		}
		return(h);
	};
	// check if element is in an array. If you will check the same array multiple times, use hasher
	Array.prototype.indexOf = function(elm) {
		var i, len, found = false;
		for (i=0, len=this.length; i<len; i++) {
			if (this[i] === elm) {
				found = true;
				break;
			}
		}
		return(found ? i : -1);
	};
	// remove an element
	Array.prototype.remove = function(elm) {
		var i = this.indexOf(elm);
		if (i>=0) {this.splice(i,1);}
	};

	// clear an object - this is messy, many people say not to play with Object.prototype, so we provide a JSORM class to do it
	exports.clear = function(o) {
		var i;
		for (i in o) {
			if (o.hasOwnProperty(i) && typeof(i) !== "function") {
				delete o[i];
			}
		}
	};


	/**
	 * Copy all of the elements of source to target. 
	 * 
	 * @param {object} target What to apply the source to
	 * @param {object} source What to use to apply
	 */
	exports.apply = function(target,source,fields) {
		var prp;
		source = source && typeof(source) === "object" ? source : {};
		fields = fields && typeof(fields) === "object" ? fields : source;
		target = target || {};
		for (prp in fields) {
			if (fields.hasOwnProperty(prp) && source.hasOwnProperty(prp)) {target[prp] = source[prp];}
		}
		return(target);
	};

	/**
	 * Take two objects, and return only elements that are common to both. If keys is true, it will match 
	 * if the keys are the same, even if the values are not, and the value of the returned object.
	 * will be set to the value of a. If keys is false (default), it will match only if the values match.
	 */
	exports.common = function(a,b,keys) {
		var i, c = {};
		if (a && typeof(a) === "object" && b && typeof(b) === "object") {
			for (i in a) {
				if (typeof(a[i]) !== "function" && typeof(b[i]) === typeof(a[i]) && (keys || a[i] === b[i])) {
					c[i] = a[i];
				}
			}		
		}
		return(c);
	};

	/**
	 * Find the first defined one in a series and return it, or null if none found
	 */
	exports.first = function() {
		var ret = null, i, len;
		for (i=0,len=arguments.length;i<len;i++) {if (arguments[i] !== undefined) {ret = arguments[i]; break;}}
		return(ret);
	};


	/**
	 * Compare two objects.
	 * Compares two objects to see if they are identical or the same object. If the objects have member objects, then
	 * it will do a deep compare.
	 * 
	 * @param {object} A The first object to compare
	 * @param {object} B The second object to compare
	 * @returns {boolean} true if identical, false if not
	 */
	exports.compare = function(a,b) {
		var ident = false, i, len, compare = exports.compare;
		if (a === b) {return(true);}
		else if (a.isArray && b.isArray) {
			len = a.length;
			if (len !== b.length) {return(false);}
			for (i=0;i<len;i++) {if (!compare(a[i],b[i])) {return(false);}}
			return(true);
		} else if (typeof(a) === "object" && typeof(b) === "object"){
	        for (i in a) {if(a.hasOwnProperty(i) && !compare(a[i], b[i])) {return (false);}}
	        for (i in b) {if(b.hasOwnProperty(i) && !compare(a[i], b[i])) {return (false);}}
			return(true);
		} else {
			return(false);
		}
	};

	/**
	 * Clone an object. 
	 * 
	 * @param {object} obj The object to clone
	 * @param {boolean} deep Whether to deep-clone. Beware, may cause infinite loops
	 * @returns {Object} The cloned object
	 */
	exports.clone = (function() {
		var c;
		c = function(obj,deep) {
			var newObj, prp, rec, type;
			if (typeof(obj) === "object" && obj !== null) {
				newObj = new obj.constructor();
				for (prp in obj) {
					if (obj.hasOwnProperty(prp) && (type = typeof(rec = obj[prp])) !== "function") {
						if (type === "object" && deep) {
							newObj[prp] = c(rec);
						} else {
					        newObj[prp] = rec;				
						}
					}
				}		
			} else {
				newObj = obj;
			}
			return(newObj);		
		};
		return(c);
	}());

	/**
	 * Clone an object iteratively.
	 * 
	 * @param {object} obj The object to clone
	 * @param {boolean} deep Whethere to deep-clone. Beware, may cause infinite loops
	 * @returns {Object} The cloned object
	 */
	exports.iclone = function(obj, deep) {
		// post-order general tree travesal is actually quite complex
		var newObj, child, o, prp, rec, type, stack = [], newP = [], children;

		// start with our root node - it has no children known yet, and no parent pointer
		stack.push({o: obj, p: null});
		newP.push(new obj.constructor());

		// as long as something is in the stack, keep going
		while(stack.length > 0) {
			// take the last item in the stack, and check for children. Do not pop it, because we are doing postorder
			obj = stack[stack.length-1];

			// if this object has had no children processed yet, process them
			if (!obj.hasOwnProperty("c")) {
				children = [];
				o = obj.o;
				for (prp in o) {
					// only do it if the key itself is not null, and the referenced item is not a function
					if (o.hasOwnProperty(prp) && (type = typeof(rec = o[prp])) !== "function") {
						// if it is an object and we are doing deep clone, we need to copy correctly
						if (type === "object" && deep) {
							children.push({o:rec,p:prp});
						} else {
					        newP[newP.length-1][prp] = rec;
						}
					}			
				}
				obj.c = children;			
			}

			// if this has children, add the first to the stack
			if (obj.c.length > 0) {
				child = obj.c.shift();
				// for debugging
				stack.push(child);
				newP.push(new child.o.constructor());
			} else {
				// no children left, so we can pop
				stack.pop();
				// is this the final one?
				newObj = newP.pop();
				if (stack.length > 0) {
					newP[newP.length-1][obj.p] = newObj;				
				}
			}
		}

		return(newObj);
	};


	/**
	 * Take a number, return it as a string, padded to the left, if necessary, with a fixed number of zeros. For example,
	 * zeropad(10,5) returns 00010, while zeropad(10,1) returns 10.
	 * 
	 * @param {int} n Number to zeropad
	 * @param {int} l Length to pad it out to
	 * @returns {String} String with number padded
	 */
	exports.zeropad = function( n,l ){ 
		var ret, d, i;
		ret = n === null || n === undefined ? '' : n.toString();
		// do we need to pad or truncate?
		d = l - ret.length;
		if (d>0) {
			for (i=0;i<d; i++) {
				ret = '0'+ret;
			}
		}
		return(ret);
	};

	/**
	 * Fork off to do an immediate asynchronous call. Usage: fork(method,arg0,arg1,arg2...argN)
	 */
	exports.fork = (function() {
		// check if we are running browser or Java based
		var fork, window = this, t;
		if (typeof(window) !== "undefined" && window.setTimeout && typeof(window.setTimeout) === "function") {
			fork = function(f) {window.setTimeout(f,1);};
		} else if (typeof(java) !== "undefined" && java.lang && java.lang.Thread && typeof(java.lang.Thread) === "function"){
			fork = function(f) {
				t = new java.lang.Thread(new java.lang.Runnable({run: function(){f();}})).start();
			};
		} else {
			// we have no fork option, so return null
			fork = null;
		}

		return(fork ? function(conf) {
			var f = conf.fn, scope = conf.scope, arg = [].concat(conf.arg);
			fork(function(){f.apply(scope,arg);});		
		} : fork);
	}());

	/**
	 * Retrieve a file from the server via Ajax. Note that Ajax means asynchronous.
	 * 
	 * @param {String} fileName File name to retrieve, relative to the existing URL.
	 * @param {Function} callback Function to call when retrieve is complete, success or failure. 
	 *   Signature is callback(fileName,xmlHttpObject,success,options,errorMessage)
	 * @param {Object} scope Scope within which to call the callback
	 * @param {Object} options Options to pass as is to callback in options parameter
	 */
	exports.ajax = function(arg) {
		// get the file via Ajax, and callback that it is ready
		var url = arg.url, callback = arg.callback, scope = arg.scope, options = arg.options, xmlHttp,
		method = arg.method || "GET", params = arg.params, pstr = null, i, h;
		try {
		    // Firefox, Opera 8.0+, Safari
		    xmlHttp=new window.XMLHttpRequest();
	    } catch (e0) {
		    // Internet Explorer
		    try {
		      xmlHttp=new window.ActiveXObject("Msxml2.XMLHTTP");
		    } catch (e1) {
		      try {
		        xmlHttp=new window.ActiveXObject("Microsoft.XMLHTTP");
		      } catch (e2) {
				exports.fork({fn: callback, scope: scope, arg: [url,xmlHttp,false,options,"Your environment does not support AJAX!"]});
		      }
		    }
		 }
		// easier to work with
		h = xmlHttp;

		 xmlHttp.onreadystatechange=function() {
			var success;
			if(h.readyState===4) {
				// HTTP will give a status of 200, while file if it returns here is always 200
				success = h.status === 200 || (document.location.protocol === 'file:');
				callback.apply(scope,[url,h,success,options]);
		    }
		 };
		 try {
			// open the request
			xmlHttp.open(method,url,true);
			// create the parameters to send
			if (params) {
				if (typeof(params) === "string") {
					pstr = params;
				} else if (typeof(params) === "object") {
					pstr = [];
					for (i in params) {
						if (params.hasOwnProperty(i)) {
							pstr.push(i+"="+arg.params[i]);
						}
					}
					pstr = pstr.join("&");
				} else {
					pstr = null;
				}
			}
			xmlHttp.send(pstr);
		} catch (e3) {
			options = options || {};
			options.e = e3;
			exports.fork({fn: callback, scope: scope, arg: [url,xmlHttp,false,options]});
		}
	};

	exports.extend = function(parent,constr,stat){

	    //return function(sp, overrides){
		var ret, proto;
		// parent can be either object literal, i.e. we are extending a literal, or function, i.e. we are extending an existing class
		if (!parent) {
			parent = {};
		} else if(typeof parent === 'object'){
			proto = parent;
		} else {
			proto = parent.prototype;
		}

		// Douglas Crockford's object function plus his power constructor
	    ret = function() {
		    var F = function(){}, that;
		    F.prototype = proto;
			that = new F();

			// save our superclass and static class
			that.superclass = proto;
			that.myclass = ret;

			// do the constructor
			if (constr !== null && typeof(constr) === 'function') {
				constr.apply(that,arguments);
			}

			// return the newly created object
			return(that);
		};

		if (stat) {exports.apply(ret,stat);}

		// return the function
	    return ret;
	};

	/*
	 * Douglas Crockford's event processing 
	 */
	exports.eventualize = function(that) {
		var registry = {};

		/**
		 * Fire an even on an object. The event can either be a string containing the name of the event or an
		 * object containing a type property containing the name of the event. Handlers registered by the 'on'
		 * method that match the event name will be invoked
		 * 
		 * Will return false if any event handler returned false, an indication not to proceed, else it will
		 * return true
		 */
		that.fire = function(event, params) {
			var array, func, handler, i, len, pass = true, ret, p,
			type = typeof(event) === 'string' ? event : event.type;

			// if there are event handlers for this event, then loop through them and execute the handlers in order
			if (registry.hasOwnProperty(type)) {
				array = registry[type];
				// Each entry in the array is a handler. Each handler record contain a method to call, and an optional
				// array of parameters. If the method itself is a name, look up the function
				for (i=0, len=array.length; i<len; i++) {
					handler = array[i];
					func = handler.method;

					// now invoke the handler. If the handler contains parameters, then pass them, otherwise
					//  pass the event object
					p = exports.apply({},handler.parameters);
					exports.apply(p,params);
					p.launcher = this;
					ret = func.apply(handler.scope, [p]);
					if (ret === false) {pass = false;}
				}
			}
			return(pass);
		};

		/**
		 * Function to register a handler.
		 * Make a handler record, put it in a handler array, making one if it does not yet exist for this type of event
		 */
		that.on = function(type, method, parameters, scope) {
			var handler = {method: method, parameters: parameters, scope: scope};
			if (registry.hasOwnProperty(type) && method && typeof(method) === "function") {
				registry[type].push(handler);
			}
			return(this);
		};

		/*
		 * Function to deregister a handler. If we have it, remove it.
		 */
		that.off = function(type, method, parameters) {
			var array, i;
			if (registry.hasOwnProperty(type)) {
				array = registry[type];
				for (i=0; i<array.length; i++) {
					if (array[i].method === method && array[i].parameters === parameters) {
						registry.splice(i,1);
						break;
					}
				}
			}
			return(this);
		};

		/*
		 * Function to register an event as handled
		 */
		that.events = function() {
			var i;
			for (i=0; i<arguments.length; i++) {
				registry[arguments[i]] = [];
			}
		};

		/*
		 * Function to deregister an event as handled
		 */
		that.nonevents = function() {
			var i;
			for (i=0; i<arguments.length; i++) {
				delete registry[arguments[i]];
			}
		};

		return(that);
	};
}(typeof(module) === "undefined" || typeof(module.exports) === "undefined" ? (this.JSORM === undefined || this.JSORM === null ? this.JSORM = {} : this.JSORM) : module.exports));
