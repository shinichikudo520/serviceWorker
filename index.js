// Service Worker 理解为一个介于客户端和服务器之间的一个代理服务器。主要为了解决js的单线程问题
/**
 * 作用：
 * 1. 拦截客户端的请求
 * 2. 向客户端发送消息
 * 3. 向服务器发起请求等等
 * 4. 其中最重要的作用之一就是离线资源缓存
 */
/**
 * 特性：
 * 1. 没有访问 DOM 的权限
 * 2. Service Worker 只能被使用在 https 或者本地的 localhost 环境下。
 * 3. 以通过 postMessage 接口把数据传递给其他 JS 文件；
 * 4. 完全异步，无法使用XHR和localStorage
 * 5. 可以使用cache storage/indexedDB缓存数据
 * 6. 可以拦截全站请求从而控制你的应用
 * 7. 一旦被 install，就永远存在，除非被 uninstall或者dev模式手动删除
 */

// 1. 注册
// 在同一个 Origin 下，我们可以注册多个 Service Worker。但是请注意，这些 Service Worker 所使用的 scope 必须是不相同的。
if('serviceWorker' in window.navigator){
	window.addEventListener('load',() => {
		// 1.1 注册函数register(path,configuration)接收两个参数
		// 第一个是 service worker 文件的路径，请注意：这个文件路径是相对于 Origin ，而不是当前 JS 文件的目录的；第二个参数是 Serivce Worker 的配置项，可选填，其中比较重要的是 scope 属性。它是 Service Worker 控制的内容的子目录，这个属性所表示的路径不能在 service worker 文件的路径之上，默认是 Serivce Worker 文件所在的目录；
		const sw = navigator.serviceWorker;
		const killSW = window.killSW || false;
		if(!sw){
			console.log('The browser does not support serviceWorker');
			return;
		}
		if(!!killSW){
			sw.getRegistration('./sw.js').then(reg => {
				// 手动注销
				reg.unregister();
				// 清除缓存
				caches &&　caches.keys && caches.keys().then(keys => {
					keys.forEach(key => {
						caches.delete(key);
					});
				});
			});
			return;
		}
		sw.register('./sw.js',{scope:'./'}).then(reg => {
			// 注册成功：
			console.log('success',reg)
			
			// 4. 通讯
			const mesChannel = new MessageChannel();
			// 4.1 从页面到sw
			// 4.1.1/4.4.1 页面发送消息
			sw.controller && sw.controller.postMessage('this message is from page,to sw!',[mesChannel.port2]);
			
			// 4.4 使用message channel通信
			// 4.4.4 使用MessageChannel接收sw发送到页面的消息
			mesChannel.port1.onmessage = e => {
				console.log(e.data);
			}
			
		}).catch(err => {
			// 注册失败
			console.log('Registration for serviceWorker failed!' + err)
		})
		
		// 当我们在注册 Service Worker 时，如果使用的 scope 不是 Origin ，那么navigator.serviceWorker.controller 会为 null。
		// 这种情况下，我们可以使用 reg.active 这个对象下的 postMessage 方法，reg.active 就是被注册后激活 Serivce Worker 实例。
		// 但是，由于 Service Worker 的激活是异步的，因此第一次注册 Service Worker 的时候，Service Worker 不会被立刻激活， reg.active 为 null，系统会报错。我采用的方式是返回一个 Promise ，在 Promise 内部进行轮询，如果 Service Worker 已经被激活，则 resolve 。
		/**
			sw.register('./sw.js',{scope:'./'}).then(reg => {
				// 注册成功：
				console.log('success',reg)
				return new Promise(resolve =>{
					const timer = setInterval(() => {
						if(reg.active){
							clearInterval(timer);
							resolve(reg.active);
						}
					},100)
				})
			}).then(sw => {
				sw.postMessage('this message is from page,to sw!');
			}).catch(err => {
				// 注册失败
				console.log('Registration for serviceWorker failed!' + err)
			});
		 */
		
		// 4.2.1 页面接收从sw发送的消息
		sw.addEventListener('message',e => {
			console.log(e.data);
		});
		
	})
}



