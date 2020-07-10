// 在默认情况下，Service Worker 必定会每24小时被下载一次，
// 如果下载的文件是最新文件，那么它就会被重新注册和安装，但不会被激活，
// 当不再有页面使用旧的 Service Worker 的时候，它就会被激活。
// 2. 注册之后监听安装事件install
self.addEventListener('install',e => {
	console.log('sevice worker install...');
	
	// 5.1 缓存指定静态资源
	const staticCache = [
		'./index.js',
	];
	// CacheStroage 在浏览器中的接口名是 caches ，
	// 我们使用 caches.open 方法新建或打开一个已存在的缓存；
	// cache.addAll 方法的作用是请求指定链接的资源并把它们存储到之前打开的缓存中。
	// 由于资源的下载、缓存是异步行为，所以我们要使用事件对象提供的 event.waitUntil 方法，它能够保证资源被缓存完成前 Service Worker 不会被安装完成，避免发生错误。
	e.waitUntil(
		caches.open('sw_demo_v1').then(cache => {
			return cache.addAll(staticCache);
		})
	);
})
const cacheNames = ['sw_demo_v2']; // cache storage白名单
// 3. 安装成功后，监听激活事件
self.addEventListener('activate',e => {
	console.log('sevice worker activate...');
	
	// 5.3 清理cache storage
	e.waitUntil(
		caches.keys().then(keys => {
			return Promise.all([
				keys.map(key => {
					if(!cacheNames.includes(key)){
						return caches.delete(key); // 删除不在白名单的cache storage
					}
				})
			]);
		}).then(() =>{
			// 立即接管所有页面
			self.clients.claim();
		})
	);
	
})

// 4.1.2/4.4.2 接收页面发送的消息
self.addEventListener('message',e => {
	console.log(e.data);
	// 4.2 从sw发送消息到页面
	// 4.2.1 sw发送消息
	e.source.postMessage('this message is from sw.js,to page!');
	// 4.4.3 使用MessageChannel，从sw发送消息到页面
	e.ports[0].postMessage('this message is from sw.js,to page!Use messageChannel!');
})

// 4.3 以上的通讯方式sw只能对消息来源的页面发送消息，以下可以不受限制发送消息
self.clients.matchAll().then(clientArr => {
	console.log('sw管理的页面：',clientArr);
	if(clientArr.length){
		// 对页面发送消息
		clientArr[0].postMessage('this message is from sw.js,to client[0]!');
	}
});

// 5. 缓存资源
/**
 * 注意：
 * 1. 当用户第一次访问页面的时候，资源的请求是早于 Service Worker 的安装的，所以静态资源是无法缓存的；只有当 Service Worker 安装完毕，用户第二次访问页面的时候，这些资源才会被缓存起来；
 * 2. Cache Stroage 只能缓存静态资源，所以它只能缓存用户的 GET 请求；post请求的数据可以缓存到indexedDB
 * 3. Cache Stroage 中的缓存不会过期，但是浏览器对它的大小是有限制的，所以需要我们定期进行清理；
 */
// 5.2 动态缓存静态资源:监听fetch事件
// 页面的路径不能大于 Service Worker 的 scope，不然 fetch 事件是无法被触发的。
self.addEventListener('fetch',e => {
	const request = e.request;
	console.log('request',request);	
	// // 非GET请求
	// if(request.method !== 'GET'){
	// 	e.respondWith(
	// 		// ...
	// 	);
	// 	return;
	// }
	// // HTML页面请求
	// if(request.headers.get('Accept').indexOf('text/html') !== -1){
	// 	e.respondWith(
	// 		// ...
	// 	);
	// 	return;
	// }
	// // get接口请求
	// if(request.headers.get('Accept').indexOf('application/json') !== -1){
	// 	e.respondWith(
	// 		// ...
	// 	);
	// 	return;
	// }
	// GET请求 且 非页面请求时 且 非get接口请求（一般请求静态资源）
	// 使用事件对象提供的 respondWith 方法，它可以劫持用户发出的 http 请求
	e.respondWith(
		// 使用用户的请求对 Cache Stroage 进行匹配，如果匹配成功，则返回存储在缓存中的资源；
		caches.match(request).then(res => {
			return res || 
				// 如果匹配失败，则向服务器请求资源返回给用户，并使用 cache.put 方法把这些新的资源存储在缓存中。因为请求和响应流只能被读取一次，所以我们要使用 clone 方法复制一份存储到缓存中，而原版则会被返回给用户
				fetch(request).then(response => {
					const responseCopy = response.clone();
					caches.open('sw_demo_v2').then(cache => {
						cache.put(request,responseCopy);
					});
					return response;
				}).catch(err => {
					console.log(err);
				});
		})
	);
})


