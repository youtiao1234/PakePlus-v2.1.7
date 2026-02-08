window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});/**
 * PakePlus 导出监控脚本
 * 只拦截"导出海报"按钮
 */

if (typeof window !== 'undefined' && window.__TAURI__) {
    
    (function() {
        "use strict";
        
        var TAURI = window.__TAURI__;
        var isProcessing = false;
        
        // 下载图片
        function downloadImage(dataUrl, filename) {
            if (isProcessing) return;
            isProcessing = true;
            
            try {
                var parts = dataUrl.split(',');
                if (parts.length !== 2) {
                    isProcessing = false;
                    return;
                }
                
                var binaryString = atob(parts[1]);
                var bytes = new Uint8Array(binaryString.length);
                for (var i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                
                if (TAURI.dialog && TAURI.dialog.save && TAURI.fs && TAURI.fs.writeFile) {
                    var ext = filename.split('.').pop() || 'jpg';
                    
                    TAURI.dialog.save({
                        defaultPath: filename,
                        filters: [{ name: '图片', extensions: [ext, 'jpg', 'png'] }]
                    }).then(function(path) {
                        if (!path) {
                            isProcessing = false;
                            return;
                        }
                        return TAURI.fs.writeFile(path, bytes);
                    }).then(function() {
                        isProcessing = false;
                    }).catch(function() {
                        browserDownload(bytes, filename);
                    });
                } else {
                    browserDownload(bytes, filename);
                }
            } catch (err) {
                isProcessing = false;
            }
        }
        
        // 浏览器下载
        function browserDownload(bytes, filename) {
            var blob = new Blob([bytes], { type: 'image/jpeg' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            isProcessing = false;
        }
        
        // 查找并监听"导出海报"按钮
        function findAndListenButton() {
            // 查找包含"导出海报"文字的按钮
            var buttons = document.querySelectorAll('button');
            var targetButton = null;
            
            for (var i = 0; i < buttons.length; i++) {
                var btn = buttons[i];
                var text = btn.textContent || btn.innerText || '';
                if (text.indexOf('导出海报') !== -1) {
                    targetButton = btn;
                    break;
                }
            }
            
            if (!targetButton) return false;
            
            // 标记按钮已处理
            if (targetButton._pakePlusHandled) return true;
            targetButton._pakePlusHandled = true;
            
            // 监听按钮点击
            targetButton.addEventListener('click', function() {
                // 设置拦截标记
                window._interceptDownload = true;
                setTimeout(function() {
                    window._interceptDownload = false;
                }, 3000);
            });
            
            return true;
        }
        
        // 拦截下载
        var originalClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function() {
            if (window._interceptDownload && (this.href.startsWith('data:') || this.href.startsWith('blob:')) && this.download) {
                var url = this.href;
                var filename = this.download || 'poster_' + Date.now() + '.jpg';
                
                if (url.startsWith('data:')) {
                    downloadImage(url, filename);
                    return;
                } else if (url.startsWith('blob:')) {
                    fetch(url)
                        .then(function(res) { return res.blob(); })
                        .then(function(blob) {
                            var reader = new FileReader();
                            reader.onload = function() {
                                downloadImage(reader.result, filename);
                            };
                            reader.readAsDataURL(blob);
                        })
                        .catch(function() {
                            isProcessing = false;
                        });
                    return;
                }
            }
            originalClick.call(this);
        };
        
        // 初始化
        function init() {
            // 尝试查找按钮
            if (!findAndListenButton()) {
                // 如果没找到，使用 MutationObserver 等待按钮出现
                var observer = new MutationObserver(function() {
                    if (findAndListenButton()) {
                        observer.disconnect();
                    }
                });
                
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            }
        }
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
        
    })();
    
}
