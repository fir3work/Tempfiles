window.dpPlugins =
    window.dpPlugins ||
    (function (e) {
        var t = {
            version: '1.1.5',
            init: function (s, i) {
                ;(t = Object.assign(i || {}, t)),
                    window.m3u8Parser ||
                        t.loadJs(
                            'https://cdn.staticfile.org/m3u8-parser/7.1.0/m3u8-parser.min.js'
                        ),
                    window.localforage ||
                        t.loadJs(
                            'https://cdn.staticfile.org/localforage/1.10.0/localforage.min.js'
                        ),
                    t.ready(s).then(() => {
                        e.forEach((e) => {
                            const i = new e(s, t)
                            s.plugins[i.constructor.name] = i
                        })
                    })
            },
            ready: function (e) {
                return new Promise(function (t, s) {
                    e.isReady
                        ? t()
                        : e.video.duration > 0 || e.video.readyState > 2
                        ? ((e.isReady = !0), t())
                        : (e.video.ondurationchange = function () {
                              ;(e.video.ondurationchange = null),
                                  (e.isReady = !0),
                                  t()
                          })
                })
            },
            query: function (e, t = document) {
                return t.querySelector(e)
            },
            queryAll: function (e, t = document) {
                return t.querySelectorAll(e)
            },
            append: function (e, t) {
                return (
                    t instanceof Element
                        ? Node.prototype.appendChild.call(e, t)
                        : e.insertAdjacentHTML('beforeend', String(t)),
                    e.lastElementChild || e.lastChild
                )
            },
            prepend: function (e, t) {
                return (
                    t instanceof Element
                        ? Node.prototype.insertBefore.call(
                              e,
                              t,
                              e.firstElementChild || e.firstChild
                          )
                        : e.insertAdjacentHTML('afterbegin', String(t)),
                    e.firstElementChild || e.firstChild
                )
            },
            insertAfter: function (e, s) {
                var i = e.parentNode
                return i.lastChild == e
                    ? t.append(i, s)
                    : ((s = t.append(i, s)),
                      Node.prototype.insertBefore.call(i, s, e.nextSibling))
            },
            remove: function (e) {
                return Node.prototype.removeChild.call(
                    e?.parentNode || document,
                    e
                )
            },
            setStyle: function (e, t, s) {
                if ('object' == typeof t) {
                    for (const s in t) e.style[s] = t[s]
                    return e
                }
                return (e.style[t] = s), e
            },
        }
        return (
            console.info(
                '\n %c dpPlugins v' +
                    t.version +
                    ' %c https://scriptcat.org/zh-CN/users/13895 \n',
                'color: #fadfa3; background: #030307; padding:5px 0;',
                'background: #fadfa3; padding:5px 0;'
            ),
            t
        )
    })([
        class HlsEvents {
            constructor(e) {
                ;(this.player = e),
                    (this.hls = this.player.plugins.hls),
                    (this.now = Date.now()),
                    (this.currentTime = 0),
                    (this.fragLoadError = 0),
                    this.player.events.type('video_end') ||
                        this.player.events.playerEvents.push('video_end'),
                    this.player.on('video_end', () => {
                        this.switchUrl()
                    }),
                    this.player.on('quality_end', () => {
                        this.hls &&
                            (this.hls.destroy(),
                            (this.hls = this.player.plugins.hls),
                            localStorage.setItem(
                                'dplayer-defaultQuality',
                                this.player.quality.name
                            ),
                            this.onEvents())
                    }),
                    this.player.on('destroy', () => {
                        this.hls && this.hls.destroy()
                    }),
                    this.onEvents()
            }
            onEvents() {
                if (this.hls) {
                    const e = window.Hls || unsafeWindow.Hls
                    this.hls.on(e.Events.ERROR, (t, s) => {
                        if (
                            (this.hls.media.currentTime > 0 &&
                                (this.currentTime = this.hls.media.currentTime),
                            s.fatal)
                        )
                            switch (
                                (this.player.notice(
                                    `当前带宽: ${
                                        Math.round(
                                            (this.hls.bandwidthEstimate /
                                                1024 /
                                                1024 /
                                                8) *
                                                100
                                        ) / 100
                                    } MB/s`
                                ),
                                s.type)
                            ) {
                                case e.ErrorTypes.NETWORK_ERROR:
                                    s.details ===
                                        e.ErrorDetails.MANIFEST_LOAD_ERROR ||
                                    s.details ===
                                        e.ErrorDetails.MANIFEST_LOAD_TIMEOUT ||
                                    s.details ===
                                        e.ErrorDetails.MANIFEST_PARSING_ERROR
                                        ? this.hls.loadSource(this.hls.url)
                                        : s.details ===
                                          e.ErrorDetails.FRAG_LOAD_ERROR
                                        ? this.fragLoadError < 10 &&
                                          (this.fragLoadError++,
                                          this.hls.loadSource(this.hls.url),
                                          (this.hls.media.currentTime =
                                              this.currentTime),
                                          this.hls.media.play())
                                        : this.hls.startLoad()
                                    break
                                case e.ErrorTypes.MEDIA_ERROR:
                                    this.hls.recoverMediaError()
                                    break
                                default:
                                    this.player.notice(
                                        '视频播放异常，请刷新重试'
                                    ),
                                        this.hls.destroy()
                            }
                        else if (s.type === e.ErrorTypes.NETWORK_ERROR)
                            if (
                                s.details === e.ErrorDetails.FRAG_LOAD_ERROR &&
                                this.isUrlExpires(this.hls.url)
                            )
                                return (
                                    (this.fragLoadError = 0),
                                    (this.now = Date.now()),
                                    this.hls.stopLoad(),
                                    this.player.plugins?.Appreciation.isAppreciation()
                                        .catch((e) =>
                                            Object.keys(localStorage).forEach(
                                                (e) =>
                                                    e.startsWith('dp') &&
                                                    localStorage.removeItem(e)
                                            )
                                        )
                                        .finally(() => {
                                            this.player.events.trigger(
                                                'video_start'
                                            )
                                        })
                                )
                    })
                }
            }
            switchUrl() {
                if (
                    this.hls &&
                    this.hls.hasOwnProperty('data') &&
                    this.hls.levelController &&
                    !this.hls.levelController.currentLevelIndex
                ) {
                    const e = (this.hls.url = this.player.quality.url)
                    fetch(e)
                        .then((e) => (e.ok ? e.text() : Promise.reject()))
                        .then((t) => {
                            const s = new (
                                window.m3u8Parser || unsafeWindow.m3u8Parser
                            ).Parser()
                            s.push(t), s.end()
                            const i = e.replace(/media.m3u8.+/, ''),
                                a = s.manifest.segments
                            this.hls.bufferController.details.fragments.forEach(
                                function (t, s) {
                                    const l = a[s]
                                    Object.assign(t, {
                                        baseurl: e,
                                        relurl: l.uri,
                                        url: i + l.uri,
                                    })
                                }
                            ),
                                this.hls.startLoad(
                                    this.player.video.currentTime
                                )
                        })
                }
            }
            isUrlExpires(e) {
                var t =
                        arguments.length > 1 && void 0 !== arguments[1]
                            ? arguments[1]
                            : 6e3,
                    s = e.match(/&x-oss-expires=(\d+)&/)
                return s
                    ? +''.concat(s[1], '000') - t < Date.now()
                    : Date.now() - this.now > 3e5 - t
            }
        },
        class ImageEnhancer {
            constructor(e, t) {
                ;(this.player = e),
                    Object.assign(this.player.user.storageName, {
                        imageenhancer: 'dplayer-imageenhancer',
                    }),
                    Object.assign(this.player.user.default, {
                        imageenhancer: 0,
                    }),
                    this.player.user.init(),
                    (this.imageenhancer =
                        this.player.user.get('imageenhancer')),
                    this.imageenhancer &&
                        (this.player.video.style.filter =
                            'contrast(1.01) brightness(1.05) saturate(1.1)'),
                    (this.player.template.imageEnhancer = t.append(
                        t.query(
                            '.dplayer-setting-origin-panel',
                            this.player.template.settingBox
                        ),
                        '<div class="dplayer-setting-item dplayer-setting-imageenhancer"><span class="dplayer-label">画质增强</span><div class="dplayer-toggle"><input class="dplayer-toggle-setting-input" type="checkbox" name="dplayer-toggle"><label for="dplayer-toggle"></label></div></div>'
                    )),
                    (this.player.template.imageEnhancerToggle = t.query(
                        'input',
                        this.player.template.imageEnhancer
                    )),
                    (this.player.template.imageEnhancerToggle.checked =
                        this.imageenhancer),
                    this.player.template.imageEnhancer.addEventListener(
                        'click',
                        () => {
                            ;(this.imageenhancer =
                                this.player.template.imageEnhancerToggle.checked =
                                    !this.player.template.imageEnhancerToggle
                                        .checked),
                                this.player.user.set(
                                    'imageenhancer',
                                    Number(this.imageenhancer)
                                ),
                                (this.player.video.style.filter = this
                                    .imageenhancer
                                    ? 'contrast(1.01) brightness(1.05) saturate(1.1)'
                                    : ''),
                                this.player.notice(
                                    '画质增强： ' +
                                        (this.imageenhancer ? '开启' : '关闭')
                                )
                        }
                    ),
                    this.player.on('playing', () => {
                        this.imageenhancer &&
                            (this.player.video.style.filter =
                                'contrast(1.01) brightness(1.05) saturate(1.1)')
                    })
            }
        },
        class SoundEnhancer {
            constructor(e, t) {
                ;(this.player = e),
                    (this.Joysound = window.Joysound || unsafeWindow.Joysound),
                    (this.localforage =
                        window.localforage || unsafeWindow.localforage),
                    (this.joySound = null),
                    (this.offset = null),
                    Object.assign(this.player.user.storageName, {
                        soundenhancer: 'dplayer-soundenhancer',
                        volumeenhancer: 'dplayer-volumeenhancer',
                    }),
                    Object.assign(this.player.user.default, {
                        soundenhancer: 0,
                        volumeenhancer: 0,
                    }),
                    this.player.user.init(),
                    (this.player.template.soundEnhancer = t.append(
                        t.query(
                            '.dplayer-setting-origin-panel',
                            this.player.template.settingBox
                        ),
                        '<div class="dplayer-setting-item dplayer-setting-soundenhancer"><span class="dplayer-label">音质增强</span><div class="dplayer-toggle"><input class="dplayer-toggle-setting-input" type="checkbox" name="dplayer-toggle"><label for="dplayer-toggle"></label></div></div>'
                    )),
                    (this.player.template.soundEnhancerToggle = t.query(
                        'input',
                        this.player.template.soundEnhancer
                    )),
                    (this.player.template.soundEnhancerToggle.checked =
                        !!this.player.user.get('soundenhancer')),
                    this.player.template.soundEnhancer.addEventListener(
                        'click',
                        () => {
                            let e =
                                (this.player.template.soundEnhancerToggle.checked =
                                    !this.player.template.soundEnhancerToggle
                                        .checked)
                            this.player.user.set('soundenhancer', Number(e)),
                                this.switchJoysound(e)
                        }
                    ),
                    (this.player.template.gainBox = t.prepend(
                        t.query(
                            '.dplayer-setting-origin-panel',
                            this.player.template.settingBox
                        ),
                        '<div class="dplayer-setting-item dplayer-setting-danmaku dplayer-setting-gain" style="display: block;"><span class="dplayer-label">音量增强</span><div class="dplayer-danmaku-bar-wrap dplayer-gain-bar-wrap"><div class="dplayer-danmaku-bar dplayer-gain-bar"><div class="dplayer-danmaku-bar-inner dplayer-gain-bar-inner" style="width: 0%;"><span class="dplayer-thumb"></span></div></div></div></div>'
                    )),
                    (this.player.template.gainBarWrap =
                        this.player.template.gainBox.querySelector(
                            '.dplayer-gain-bar-wrap'
                        )),
                    (this.player.bar.elements.gain =
                        this.player.template.gainBox.querySelector(
                            '.dplayer-gain-bar-inner'
                        ))
                const s = (e) => {
                        const t = e || window.event
                        let s =
                            ((t.clientX || t.changedTouches[0].clientX) -
                                this.getElementViewLeft(
                                    this.player.template.gainBarWrap
                                )) /
                            130
                        this.switchGainValue(s)
                    },
                    i = () => {
                        document.removeEventListener('touchend', i),
                            document.removeEventListener('touchmove', s),
                            document.removeEventListener('mouseup', i),
                            document.removeEventListener('mousemove', s),
                            this.player.template.gainBox.classList.remove(
                                'dplayer-setting-danmaku-active'
                            )
                    }
                this.player.template.gainBarWrap.addEventListener(
                    'click',
                    (e) => {
                        const t = e || window.event
                        let s =
                            ((t.clientX || t.changedTouches[0].clientX) -
                                this.getElementViewLeft(
                                    this.player.template.gainBarWrap
                                )) /
                            130
                        this.switchGainValue(s)
                    }
                ),
                    this.player.template.gainBarWrap.addEventListener(
                        'touchstart',
                        () => {
                            document.addEventListener('touchmove', s),
                                document.addEventListener('touchend', i),
                                this.player.template.gainBox.classList.add(
                                    'dplayer-setting-danmaku-active'
                                )
                        }
                    ),
                    this.player.template.gainBarWrap.addEventListener(
                        'mousedown',
                        () => {
                            document.addEventListener('mousemove', s),
                                document.addEventListener('mouseup', i),
                                this.player.template.gainBox.classList.add(
                                    'dplayer-setting-danmaku-active'
                                )
                        }
                    ),
                    this.player.on('playing', () => {
                        this.localforage.getItem('playing').then((e) => {
                            ;(e = e || 0),
                                ++e < 1e3 &&
                                    ((this.player.plugins.hls.data = !0),
                                    this.localforage.setItem('playing', e))
                        }),
                            this.player.video.joySound || this.init()
                    })
            }
            init() {
                if (this.Joysound && this.Joysound.isSupport()) {
                    ;(this.joySound = new this.Joysound()),
                        this.joySound.init(this.player.video),
                        (this.player.video.joySound = !0)
                    let e = this.player.user.get('soundenhancer')
                    e && this.switchJoysound(e)
                    let t = this.player.user.get('volumeenhancer')
                    t && this.switchGainValue(t)
                }
            }
            switchJoysound(e) {
                this.joySound
                    ? (this.joySound.setEnabled(e),
                      this.player.notice('音质增强： ' + (e ? '开启' : '关闭')))
                    : this.player.notice('Joysound 未完成初始化')
            }
            switchGainValue(e) {
                this.joySound
                    ? ((e = Math.min(Math.max(e, 0), 1)),
                      this.player.bar.set('gain', e, 'width'),
                      this.player.user.set('volumeenhancer', e),
                      this.joySound.setVolume(e),
                      this.player.notice(
                          `音量增强： ${100 + Math.floor(100 * e)}%`
                      ))
                    : this.player.notice('Joysound 未完成初始化')
            }
            getElementViewLeft(e) {
                const t =
                    window.scrollY ||
                    window.pageYOffset ||
                    document.body.scrollTop +
                        ((document.documentElement &&
                            document.documentElement.scrollTop) ||
                            0)
                if (e.getBoundingClientRect) {
                    if ('number' != typeof this.offset) {
                        let e = document.createElement('div')
                        ;(e.style.cssText = 'position:absolute;top:0;left:0;'),
                            document.body.appendChild(e),
                            (this.offset = -e.getBoundingClientRect().top - t),
                            document.body.removeChild(e),
                            (e = null)
                    }
                    return e.getBoundingClientRect().left + this.offset
                }
                {
                    let t = e.offsetLeft,
                        s = e.offsetParent
                    const i =
                        document.body.scrollLeft +
                        document.documentElement.scrollLeft
                    if (
                        document.fullscreenElement ||
                        document.mozFullScreenElement ||
                        document.webkitFullscreenElement
                    )
                        for (; null !== s && s !== e; )
                            (t += s.offsetLeft), (s = s.offsetParent)
                    else
                        for (; null !== s; )
                            (t += s.offsetLeft), (s = s.offsetParent)
                    return t - i
                }
            }
        },
        class AspectRatio {
            constructor(e) {
                ;(this.player = e),
                    (this.value = null),
                    this.player.template.controller
                        .querySelector('.dplayer-icons-right')
                        .insertAdjacentHTML(
                            'afterbegin',
                            '<div class="dplayer-quality dplayer-aspectRatio"><button class="dplayer-icon dplayer-quality-icon">画面比例</button><div class="dplayer-quality-mask"><div class="dplayer-quality-list dplayer-aspectRatio-list"><div class="dplayer-quality-item" data-value="none">原始比例</div><div class="dplayer-quality-item" data-value="cover">自动裁剪</div><div class="dplayer-quality-item" data-value="fill">拉伸填充</div><div class="dplayer-quality-item" data-value="">系统默认</div></div></div></div>'
                        ),
                    (this.player.template.aspectRatioButton =
                        this.player.template.controller.querySelector(
                            '.dplayer-aspectRatio button'
                        )),
                    (this.player.template.aspectRatioList =
                        this.player.template.controller.querySelector(
                            '.dplayer-aspectRatio-list'
                        )),
                    this.player.template.aspectRatioList.addEventListener(
                        'click',
                        (e) => {
                            e.target.classList.contains(
                                'dplayer-quality-item'
                            ) &&
                                ((this.value = e.target.dataset.value),
                                (this.player.video.style['object-fit'] =
                                    e.target.dataset.value),
                                (this.player.template.aspectRatioButton.innerText =
                                    e.target.innerText))
                        }
                    ),
                    this.player.on('playing', () => {
                        this.value &&
                            (this.player.video.style['object-fit'] = this.value)
                    })
            }
        },
        class SelectEpisode {
            constructor(e, t) {
                ;(this.player = e),
                    Array.isArray(this.player.options.fileList) &&
                        this.player.options.fileList.length > 1 &&
                        this.player.options.file &&
                        (this.player.events.type('episode_end') ||
                            this.player.events.playerEvents.push('episode_end'),
                        this.player.on('episode_end', () => {
                            this.switchVideo()
                        }),
                        (this.player.fileIndex = (
                            this.player.options.fileList || []
                        ).findIndex(
                            (e, t) =>
                                e.file_id === this.player.options.file.file_id
                        )),
                        t.prepend(
                            this.player.template.controller.querySelector(
                                '.dplayer-icons-right'
                            ),
                            '<style>.episode .content{max-width: 360px;max-height: 330px;width: auto;height: auto;box-sizing: border-box;overflow: hidden auto;position: absolute;left: 0px;transition: all 0.38s ease-in-out 0s;bottom: 52px;transform: scale(0);z-index: 2;}.episode .content .list{background-color: rgba(0,0,0,.3);height: 100%;}.episode .content .video-item{color: #fff;cursor: pointer;font-size: 14px;line-height: 35px;overflow: hidden;padding: 0 10px;text-overflow: ellipsis;text-align: center;white-space: nowrap;}.episode .content .active{background-color: rgba(0,0,0,.3);color: #0df;}</style><div class="dplayer-quality episode"><button class="dplayer-icon prev-icon" title="上一集"><svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M757.527273 190.138182L382.510545 490.123636a28.020364 28.020364 0 0 0 0 43.752728l375.016728 299.985454a28.020364 28.020364 0 0 0 45.474909-21.876363V212.014545a28.020364 28.020364 0 0 0-45.474909-21.876363zM249.949091 221.509818a28.020364 28.020364 0 0 0-27.973818 27.973818v525.032728a28.020364 28.020364 0 1 0 55.994182 0V249.483636a28.020364 28.020364 0 0 0-28.020364-27.973818zM747.054545 270.242909v483.514182L444.834909 512l302.173091-241.757091z"></path></svg></button><button class="dplayer-icon dplayer-quality-icon episode-icon">选集</button><button class="dplayer-icon next-icon" title="下一集"><svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M248.506182 190.138182l374.970182 299.985454a28.020364 28.020364 0 0 1 0 43.752728L248.552727 833.861818a28.020364 28.020364 0 0 1-45.521454-21.876363V212.014545c0-23.505455 27.182545-36.538182 45.521454-21.876363z m507.485091 31.371636c15.453091 0 28.020364 12.567273 28.020363 27.973818v525.032728a28.020364 28.020364 0 1 1-55.994181 0V249.483636c0-15.453091 12.520727-27.973818 27.973818-27.973818zM258.978909 270.242909v483.514182L561.198545 512 258.978909 270.242909z"></path></svg></button><div class="content"><div class="list"></div></div></div>'
                        ),
                        (this.player.template.episodeButton =
                            this.player.template.controller.querySelector(
                                '.episode .episode-icon'
                            )),
                        (this.player.template.episodePrevButton =
                            this.player.template.controller.querySelector(
                                '.episode .prev-icon'
                            )),
                        (this.player.template.episodeNextButton =
                            this.player.template.controller.querySelector(
                                '.episode .next-icon'
                            )),
                        (this.player.template.episodeContent =
                            this.player.template.controller.querySelector(
                                '.episode .content'
                            )),
                        (this.player.template.episodeList =
                            this.player.template.controller.querySelector(
                                '.episode .list'
                            )),
                        this.player.options.fileList.forEach((e, s) => {
                            t.append(
                                this.player.template.episodeList,
                                '<div class="video-item" data-index="' +
                                    s +
                                    '" title="' +
                                    e.name +
                                    '">' +
                                    e.name +
                                    '</div>'
                            )
                        }),
                        (this.player.template.episodeVideoItems =
                            this.player.template.controller.querySelectorAll(
                                '.episode .video-item'
                            )),
                        this.player.template.episodeVideoItems.length &&
                            this.player.fileIndex >= 0 &&
                            this.player.template.episodeVideoItems[
                                this.player.fileIndex
                            ].classList.add('active'),
                        this.player.template.mask.addEventListener(
                            'click',
                            () => {
                                this.hide()
                            }
                        ),
                        this.player.template.episodeButton.addEventListener(
                            'click',
                            (e) => {
                                'scale(1)' ===
                                this.player.template.episodeContent.style
                                    .transform
                                    ? this.hide()
                                    : this.show()
                            }
                        ),
                        this.player.template.episodeList.addEventListener(
                            'click',
                            (e) => {
                                e.target.classList.contains('video-item') &&
                                    !e.target.classList.contains('active') &&
                                    (this.player.template.episodeVideoItems[
                                        this.player.fileIndex
                                    ].classList.remove('active'),
                                    e.target.classList.add('active'),
                                    (this.player.fileIndex =
                                        1 * e.target.dataset.index),
                                    (this.player.options.file =
                                        this.player.options.fileList[
                                            this.player.fileIndex
                                        ]),
                                    this.hide(),
                                    this.player.events.trigger('episode_start'),
                                    this.player.notice(
                                        '准备播放：' +
                                            this.player.options.file.name,
                                        5e3
                                    ))
                            }
                        ),
                        this.player.template.episodePrevButton.addEventListener(
                            'click',
                            (e) => {
                                const t = this.player.fileIndex - 1
                                t >= 0
                                    ? (this.player.template.episodeVideoItems[
                                          this.player.fileIndex
                                      ].classList.remove('active'),
                                      this.player.template.episodeVideoItems[
                                          t
                                      ].classList.add('active'),
                                      (this.player.fileIndex = t),
                                      (this.player.options.file =
                                          this.player.options.fileList[
                                              this.player.fileIndex
                                          ]),
                                      this.hide(),
                                      this.player.events.trigger(
                                          'episode_start'
                                      ),
                                      this.player.notice(
                                          '准备播放：' +
                                              this.player.options.file.name,
                                          5e3
                                      ))
                                    : this.player.notice('没有上一集了')
                            }
                        ),
                        this.player.template.episodeNextButton.addEventListener(
                            'click',
                            (e) => {
                                const t = this.player.fileIndex + 1
                                t <= this.player.options.fileList.length - 1
                                    ? (this.player.template.episodeVideoItems[
                                          this.player.fileIndex
                                      ].classList.remove('active'),
                                      this.player.template.episodeVideoItems[
                                          t
                                      ].classList.add('active'),
                                      (this.player.fileIndex = t),
                                      (this.player.options.file =
                                          this.player.options.fileList[
                                              this.player.fileIndex
                                          ]),
                                      this.hide(),
                                      this.player.events.trigger(
                                          'episode_start'
                                      ),
                                      this.player.notice(
                                          '准备播放：' +
                                              this.player.options.file.name,
                                          5e3
                                      ))
                                    : this.player.notice('没有下一集了')
                            }
                        ))
            }
            switchVideo() {
                this.player.switchVideo({
                    url: this.player.quality.url,
                    type: 'hls',
                }),
                    (this.player.video.oncanplay = () => {
                        ;(this.player.video.oncanplay = null),
                            this.player.play(),
                            this.player.events.trigger('quality_end')
                    })
            }
            show() {
                ;(this.player.template.episodeContent.style.transform =
                    'scale(1)'),
                    this.player.template.mask.classList.add('dplayer-mask-show')
            }
            hide() {
                ;(this.player.template.episodeContent.style.transform =
                    'scale(0)'),
                    this.player.template.mask.classList.remove(
                        'dplayer-mask-show'
                    )
            }
        },
        class AutoNextEpisode {
            constructor(e, t) {
                ;(this.player = e),
                    Object.assign(this.player.user.storageName, {
                        autonextepisode: 'dplayer-autonextepisode',
                    }),
                    Object.assign(this.player.user.default, {
                        autonextepisode: 0,
                    }),
                    this.player.user.init(),
                    (this.autonextepisode =
                        this.player.user.get('autonextepisode')),
                    (this.player.template.autoNextEpisode = t.append(
                        t.query(
                            '.dplayer-setting-origin-panel',
                            this.player.template.settingBox
                        ),
                        '<div class="dplayer-setting-item dplayer-setting-autonextepisode"><span class="dplayer-label">自动下一集</span><div class="dplayer-toggle"><input class="dplayer-toggle-setting-input" type="checkbox" name="dplayer-toggle"><label for="dplayer-toggle"></label></div></div>'
                    )),
                    (this.player.template.autoNextEpisodeToggle = t.query(
                        'input',
                        this.player.template.autoNextEpisode
                    )),
                    (this.player.template.autoNextEpisodeToggle.checked =
                        this.autonextepisode),
                    this.player.template.autoNextEpisode.addEventListener(
                        'click',
                        () => {
                            ;(this.autonextepisode =
                                this.player.template.autoNextEpisodeToggle.checked =
                                    !this.player.template.autoNextEpisodeToggle
                                        .checked),
                                this.player.user.set(
                                    'autonextepisode',
                                    Number(this.autonextepisode)
                                ),
                                this.player.notice(
                                    '自动播放下集： ' +
                                        (this.autonextepisode ? '开启' : '关闭')
                                )
                        }
                    ),
                    this.player.on('ended', () => {
                        this.autonextepisode &&
                            this.player.template.episodeNextButton &&
                            this.player.template.episodeNextButton.click()
                    })
            }
        },
        class MemoryPlay {
            constructor(e, t) {
                ;(this.player = e),
                    (this.file_id = this.player.options?.file?.file_id),
                    (this.hasMemoryDisplay = !1),
                    Object.assign(this.player.user.storageName, {
                        automemoryplay: 'dplayer-automemoryplay',
                    }),
                    Object.assign(this.player.user.default, {
                        automemoryplay: 0,
                    }),
                    this.player.user.init(),
                    (this.automemoryplay =
                        this.player.user.get('automemoryplay')),
                    (this.player.template.autoMemoryPlay = t.append(
                        t.query(
                            '.dplayer-setting-origin-panel',
                            this.player.template.settingBox
                        ),
                        '<div class="dplayer-setting-item dplayer-setting-automemoryplay"><span class="dplayer-label">自动记忆播放</span><div class="dplayer-toggle"><input class="dplayer-toggle-setting-input" type="checkbox" name="dplayer-toggle"><label for="dplayer-toggle"></label></div></div>'
                    )),
                    (this.player.template.autoMemoryPlayToggle = t.query(
                        'input',
                        this.player.template.autoMemoryPlay
                    )),
                    (this.player.template.autoMemoryPlayToggle.checked =
                        this.automemoryplay),
                    this.player.template.autoMemoryPlay.addEventListener(
                        'click',
                        () => {
                            ;(this.automemoryplay =
                                this.player.template.autoMemoryPlayToggle.checked =
                                    !this.player.template.autoMemoryPlayToggle
                                        .checked),
                                this.player.user.set(
                                    'automemoryplay',
                                    Number(this.automemoryplay)
                                ),
                                this.player.notice(
                                    '自动记忆播放： ' +
                                        (this.automemoryplay ? '开启' : '关闭')
                                )
                        }
                    ),
                    this.player.on('quality_end', () => {
                        this.file_id !== this.player.options?.file?.file_id &&
                            ((this.file_id =
                                this.player.options?.file?.file_id),
                            (this.hasMemoryDisplay = !1)),
                            this.run()
                    }),
                    (document.onvisibilitychange = () => {
                        if ('hidden' === document.visibilityState) {
                            const {
                                video: { currentTime: e, duration: t },
                            } = this.player
                            this.setTime(this.file_id, e, t)
                        }
                    }),
                    (window.onbeforeunload = () => {
                        const {
                            video: { currentTime: e, duration: t },
                        } = this.player
                        this.setTime(this.file_id, e, t)
                    }),
                    this.run()
            }
            run() {
                if (!1 === this.hasMemoryDisplay) {
                    this.hasMemoryDisplay = !0
                    const {
                            video: { currentTime: e, duration: t },
                        } = this.player,
                        s = this.getTime(this.file_id)
                    if (s && s > e)
                        if (this.automemoryplay)
                            this.player.seek(s),
                                this.player.video.paused && this.player.play()
                        else {
                            const e = this.formatTime(s)
                            let t = document.createElement('div')
                            t.setAttribute('class', 'memory-play-wrap'),
                                t.setAttribute(
                                    'style',
                                    'display: block;position: absolute;left: 33px;bottom: 66px;font-size: 15px;padding: 7px;border-radius: 3px;color: #fff;z-index:100;background: rgba(0,0,0,.5);'
                                ),
                                (t.innerHTML =
                                    '上次播放到：' +
                                    e +
                                    '&nbsp;&nbsp;<a href="javascript:void(0);" class="play-jump" style="text-decoration: none;color: #06c;"> 跳转播放 &nbsp;</a><em class="close-btn" style="display: inline-block;width: 15px;height: 15px;vertical-align: middle;cursor: pointer;background: url(https://nd-static.bdstatic.com/m-static/disk-share/widget/pageModule/share-file-main/fileType/video/img/video-flash-closebtn_15f0e97.png) no-repeat;"></em>'),
                                this.player.container.insertBefore(t, null)
                            let i = setTimeout(() => {
                                this.player.container.removeChild(t)
                            }, 15e3)
                            ;(t.querySelector('.close-btn').onclick = () => {
                                this.player.container.removeChild(t),
                                    clearTimeout(i)
                            }),
                                (t.querySelector('.play-jump').onclick = () => {
                                    this.player.seek(s),
                                        this.player.container.removeChild(t),
                                        clearTimeout(i)
                                })
                        }
                }
            }
            getTime(e) {
                return localStorage.getItem('video_' + e) || 0
            }
            setTime(e, t, s) {
                e &&
                    t &&
                    ((e = 'video_' + e),
                    t <= 60 || t + 120 >= s
                        ? localStorage.removeItem(e)
                        : localStorage.setItem(e, t))
            }
            formatTime(e) {
                var t = Math.round(e),
                    s = Math.floor(t / 3600),
                    i = Math.floor((t - 3600 * s) / 60),
                    a = t - 3600 * s - 60 * i
                return (
                    i < 10 && (i = '0' + i),
                    a < 10 && (a = '0' + a),
                    0 === s ? i + ':' + a : s + ':' + i + ':' + a
                )
            }
        },
        class SkipPosition {
            constructor(e, t) {
                ;(this.player = e),
                    (this.file_id = this.player.options?.file?.file_id),
                    (this.timer = null),
                    Object.assign(this.player.user.storageName, {
                        skipposition: 'dplayer-skipposition',
                        skipstarttime: 'dplayer-skipstarttime',
                        skipendtime: 'dplayer-endtime',
                    }),
                    Object.assign(this.player.user.default, {
                        skipposition: 0,
                        skipstarttime: 0,
                        skipendtime: 0,
                    }),
                    this.player.user.init(),
                    (this.skipposition = this.player.user.get('skipposition')),
                    (this.skipstarttime =
                        this.player.user.get('skipstarttime')),
                    (this.skipendtime = this.player.user.get('skipendtime')),
                    (this.player.template.skipPosition = t.append(
                        t.query(
                            '.dplayer-setting-origin-panel',
                            this.player.template.settingBox
                        ),
                        '<div class="dplayer-setting-item dplayer-setting-skipposition"><span class="dplayer-label">跳过片头片尾</span><div class="dplayer-toggle"><input class="dplayer-toggle-setting-input" type="checkbox" name="dplayer-toggle"><label for="dplayer-toggle"></label></div></div>'
                    )),
                    (this.player.template.skipPositionToggle = t.query(
                        'input',
                        this.player.template.skipPosition
                    )),
                    (this.player.template.skipPositionToggle.checked =
                        this.skipposition),
                    (this.player.template.skipPositionBox = t.insertAfter(
                        this.player.template.settingBox,
                        '<div class="dplayer-setting-skipposition-item" style="display: none;right: 155px;position: absolute;bottom: 50px;width: 150px;border-radius: 2px;background: rgba(28, 28, 28, 0.9);padding: 7px 0px;transition: all 0.3s ease-in-out 0s;overflow: hidden;z-index: 2;"><div class="dplayer-skipposition-item" style="padding: 5px 10px;box-sizing: border-box;cursor: pointer;position: relative;"><span class="dplayer-skipposition-label" title="双击设置当前时间为跳过片头时间" style="color: #eee;font-size: 13px;display: inline-block;vertical-align: middle;white-space: nowrap;">片头时间：</span><input type="number" style="width: 55px;height: 15px;top: 3px;font-size: 13px;border: 1px solid #fff;border-radius: 3px;text-align: center;background-color: #fff;" step="1" min="0" value="60"></div><div class="dplayer-skipposition-item" style="padding: 5px 10px;box-sizing: border-box;cursor: pointer;position: relative;"><span class="dplayer-skipposition-label" title="双击设置剩余时间为跳过片尾时间" style="color: #eee;font-size: 13px;display: inline-block;vertical-align: middle;white-space: nowrap;">片尾时间：</span><input type="number" style="width: 55px;height: 15px;top: 3px;font-size: 13px;border: 1px solid #fff;border-radius: 3px;text-align: center;background-color: #fff;" step="1" min="0" value="120"></div></div>'
                    )),
                    (this.player.template.skipPositionItems = t.queryAll(
                        '.dplayer-skipposition-item',
                        this.player.template.skipPositionBox
                    )),
                    (this.player.template.jumpStartSpan = t.query(
                        'span',
                        this.player.template.skipPositionItems[0]
                    )),
                    (this.player.template.jumpStartInput = t.query(
                        'input',
                        this.player.template.skipPositionItems[0]
                    )),
                    (this.player.template.jumpEndSpan = t.query(
                        'span',
                        this.player.template.skipPositionItems[1]
                    )),
                    (this.player.template.jumpEndInput = t.query(
                        'input',
                        this.player.template.skipPositionItems[1]
                    )),
                    (this.player.template.jumpStartInput.value =
                        this.skipstarttime),
                    (this.player.template.jumpEndInput.value =
                        this.skipendtime),
                    this.player.template.jumpStartSpan.addEventListener(
                        'dblclick',
                        (e) => {
                            ;(this.player.template.jumpStartInput.value =
                                this.player.video.currentTime),
                                (this.skipstarttime =
                                    this.player.video.currentTime)
                        }
                    ),
                    this.player.template.jumpStartInput.addEventListener(
                        'input',
                        (e) => {
                            ;(this.skipstarttime = 1 * e.target.value),
                                this.player.user.set(
                                    'skipstarttime',
                                    this.skipstarttime
                                )
                        }
                    ),
                    this.player.template.jumpEndSpan.addEventListener(
                        'dblclick',
                        (e) => {
                            ;(this.skipendtime =
                                this.player.video.duration -
                                this.player.video.currentTime),
                                (this.player.template.jumpEndInput.value =
                                    this.skipendtime)
                        }
                    ),
                    this.player.template.jumpEndInput.addEventListener(
                        'input',
                        (e) => {
                            ;(this.skipendtime = 1 * e.target.value),
                                this.player.user.set(
                                    'skipendtime',
                                    this.skipendtime
                                )
                        }
                    ),
                    this.player.template.skipPosition.addEventListener(
                        'click',
                        () => {
                            ;(this.skipposition =
                                this.player.template.skipPositionToggle.checked =
                                    !this.player.template.skipPositionToggle
                                        .checked),
                                this.player.user.set(
                                    'skipposition',
                                    Number(this.skipposition)
                                ),
                                this.skipposition ? this.show() : this.hide(),
                                this.player.notice(
                                    '跳过片头片尾： ' +
                                        (this.skipposition ? '开启' : '关闭')
                                )
                        }
                    ),
                    this.player.template.skipPosition.addEventListener(
                        'mouseenter',
                        () => {
                            this.skipposition && this.show()
                        }
                    ),
                    this.player.template.mask.addEventListener('click', () => {
                        this.hide()
                    }),
                    this.player.on('quality_end', () => {
                        this.file_id !== this.player.options?.file?.file_id &&
                            ((this.file_id =
                                this.player.options?.file?.file_id),
                            this.jumpStart(),
                            this.jumpEnd())
                    }),
                    this.skipposition && (this.jumpStart(), this.jumpEnd())
            }
            jumpStart() {
                this.skipposition &&
                    this.skipstarttime > this.player.video.currentTime &&
                    (this.player.video.currentTime = this.skipstarttime)
            }
            jumpEnd() {
                this.timer ||
                    (this.timer = setInterval(() => {
                        this.skipposition &&
                            this.skipendtime >=
                                this.player.video.duration -
                                    this.player.video.currentTime &&
                            ((this.player.video.currentTime =
                                this.player.video.duration),
                            clearInterval(this.timer),
                            (this.timer = null))
                    }, 3e3))
            }
            show() {
                this.player.template.skipPositionBox.style.display = 'block'
            }
            hide() {
                this.player.template.skipPositionBox.style.display = 'none'
            }
        },
        class Subtitle {
            constructor(e, t) {
                if (
                    ((this.player = e),
                    (this.offset = 0),
                    (this.offsetStep = 1),
                    (this.color = this.get('color') || '#fff'),
                    (this.bottom = this.get('bottom') || '40px'),
                    (this.fontSize = this.get('fontSize') || '20px'),
                    Object.assign(this.player.user.storageName, {
                        specialsubtitle: 'dplayer-specialsubtitle',
                    }),
                    Object.assign(this.player.user.default, {
                        specialsubtitle: 0,
                    }),
                    this.player.user.init(),
                    (this.specialsubtitle =
                        this.player.user.get('specialsubtitle')),
                    this.specialsubtitle)
                )
                    return
                ;(this.player.template.subtitleSpecial = t.append(
                    t.query(
                        '.dplayer-setting-origin-panel',
                        this.player.template.settingBox
                    ),
                    '<div class="dplayer-setting-item dplayer-setting-specialsubtitle"><span class="dplayer-label">特效字幕</span><div class="dplayer-toggle"><input class="dplayer-toggle-setting-input" type="checkbox" name="dplayer-toggle"><label for="dplayer-toggle"></label></div></div>'
                )),
                    (this.player.template.subtitleSpecialToggle = t.query(
                        'input',
                        this.player.template.subtitleSpecial
                    )),
                    (this.player.template.subtitleSpecialToggle.checked =
                        this.specialsubtitle),
                    this.player.template.subtitleSpecial.addEventListener(
                        'click',
                        () => {
                            ;(this.specialsubtitle =
                                this.player.template.subtitleSpecialToggle.checked =
                                    !this.player.template.subtitleSpecialToggle
                                        .checked),
                                this.player.user.set(
                                    'specialsubtitle',
                                    Number(this.specialsubtitle)
                                ),
                                this.player.notice(
                                    '特效字幕： ' +
                                        (this.specialsubtitle ? '开启' : '关闭')
                                ),
                                this.specialsubtitle && location.reload()
                        }
                    ),
                    e.events.type('subtitle_end') ||
                        e.events.playerEvents.push('subtitle_end'),
                    e.on('subtitle_end', () => {
                        this.add(this.player.options.subtitles)
                    }),
                    this.player.events.trigger('subtitle_start'),
                    this.player.on('quality_end', () => {
                        ;(this.player.template.subtitle.innerHTML = '<p></p>'),
                            this.player.options.subtitle.url.length &&
                            this.player.options.subtitles.length
                                ? this.switch(
                                      this.player.options.subtitles[
                                          this.player.options.subtitle.index
                                      ]
                                  )
                                : this.player.events.trigger('subtitle_start')
                    }),
                    this.player.on('episode_end', () => {
                        this.clear(),
                            this.style({
                                color: this.color,
                                bottom: this.bottom,
                                fontSize: this.fontSize,
                            })
                    }),
                    this.player.on('video_end', () => {
                        this.style({
                            color: this.color,
                            bottom: this.bottom,
                            fontSize: this.fontSize,
                        })
                    }),
                    (this.player.template.subtitleSettingBox = t.append(
                        this.player.template.controller,
                        '<div class="dplayer-icons dplayer-comment-box subtitle-setting-box" style="bottom: 10px;left: auto;right: 400px !important;display: block;"><div class="dplayer-comment-setting-box"><div class="dplayer-comment-setting-color"><div class="dplayer-comment-setting-title">字幕颜色<button type="text" class="color-custom" style="line-height: 16px;font-size: 12px;top: 12px;right: 12px;color: #fff;background: rgba(28, 28, 28, 0.9);position: absolute;">自定义</button></div><label><input type="radio" name="dplayer-danmaku-color-1" value="#fff" checked=""><span style="background: #fff;"></span></label><label><input type="radio" name="dplayer-danmaku-color-1" value="#e54256"><span style="background: #e54256"></span></label><label><input type="radio" name="dplayer-danmaku-color-1" value="#ffe133"><span style="background: #ffe133"></span></label><label><input type="radio" name="dplayer-danmaku-color-1" value="#64DD17"><span style="background: #64DD17"></span></label><label><input type="radio" name="dplayer-danmaku-color-1" value="#39ccff"><span style="background: #39ccff"></span></label><label><input type="radio" name="dplayer-danmaku-color-1" value="#D500F9"><span style="background: #D500F9"></span></label></div><div class="dplayer-comment-setting-type"><div class="dplayer-comment-setting-title">字幕位置</div><label><input type="radio" name="dplayer-danmaku-type-1" value="1"><span>上移</span></label><label><input type="radio" name="dplayer-danmaku-type-1" value="0" checked=""><span>默认</span></label><label><input type="radio" name="dplayer-danmaku-type-1" value="2"><span>下移</span></label></div><div class="dplayer-comment-setting-type"><div class="dplayer-comment-setting-title">字幕大小</div><label><input type="radio" name="dplayer-danmaku-type-1" value="1"><span>加大</span></label><label><input type="radio" name="dplayer-danmaku-type-1" value="0"><span>默认</span></label><label><input type="radio" name="dplayer-danmaku-type-1" value="2"><span>减小</span></label></div><div class="dplayer-comment-setting-type"><div class="dplayer-comment-setting-title">字幕偏移<div style="margin-top: -30px;right: 14px;position: absolute;">偏移量<input type="number" class="subtitle-offset-step" style="height: 14px;width: 50px;margin-left: 4px;border: 1px solid #fff;border-radius: 3px;color: #fff;background: rgba(28, 28, 28, 0.9);text-align: center;" value="1" step="1" min="1"></div></div><label><input type="radio" name="dplayer-danmaku-type-1" value="1"><span>前移</span></label><label><span><input type="text" class="subtitle-offset" style="width: 94%;height: 14px;background: rgba(28, 28, 28, 0.9);border: 0px solid #fff;text-align: center;" value="0" title="双击恢复默认"></span></label><label><input type="radio" name="dplayer-danmaku-type-1" value="2"><span>后移</span></label></div><div class="dplayer-comment-setting-type"><div class="dplayer-comment-setting-title">更多字幕功能</div><label><input type="radio" name="dplayer-danmaku-type-1" value="1"><span>本地字幕</span></label><label><input type="radio" name="dplayer-danmaku-type-1" value="0"><span>待定</span></label><label><input type="radio" name="dplayer-danmaku-type-1" value="2"><span>待定</span></label></div></div></div>'
                    )),
                    (this.player.template.subtitleCommentSettingBox = t.query(
                        '.dplayer-comment-setting-box',
                        this.player.template.subtitleSettingBox
                    )),
                    (this.player.template.subtitleSetting = t.append(
                        t.query(
                            '.dplayer-setting-origin-panel',
                            this.player.template.settingBox
                        ),
                        '<div class="dplayer-setting-item dplayer-setting-subtitle"><span class="dplayer-label">字幕设置</span><div class="dplayer-toggle"><svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 32 32"><path d="M22 16l-10.105-10.6-1.895 1.987 8.211 8.613-8.211 8.612 1.895 1.988 8.211-8.613z"></path></svg></div></div>'
                    )),
                    this.player.template.mask.addEventListener('click', () => {
                        this.hide()
                    }),
                    this.player.template.subtitleSetting.addEventListener(
                        'click',
                        () => {
                            this.toggle()
                        }
                    ),
                    (this.player.template.subtitleColorPicker = t.append(
                        this.player.template.container,
                        '<input type="color" id="colorPicker">'
                    )),
                    (this.player.template.subtitleColorCustom = t.query(
                        '.color-custom',
                        this.player.template.subtitleCommentSettingBox
                    )),
                    this.player.template.subtitleColorCustom.addEventListener(
                        'click',
                        () => {
                            this.player.template.subtitleColorPicker.click()
                        }
                    ),
                    this.player.template.subtitleColorPicker.addEventListener(
                        'input',
                        (e) => {
                            ;(this.color = e.target.value),
                                this.set('color', this.color),
                                this.style({ color: this.color })
                        }
                    ),
                    (this.player.template.subtitleSettingColor = t.query(
                        '.dplayer-comment-setting-color',
                        this.player.template.subtitleCommentSettingBox
                    )),
                    this.player.template.subtitleSettingColor.addEventListener(
                        'click',
                        (e) => {
                            'INPUT' === e.target.nodeName &&
                                ((this.color = e.target.value),
                                this.set('color', this.color),
                                this.style({ color: this.color }))
                        }
                    ),
                    (this.player.template.subtitleSettingItem = t.queryAll(
                        '.dplayer-comment-setting-type',
                        this.player.template.subtitleCommentSettingBox
                    )),
                    this.player.template.subtitleSettingItem[0].addEventListener(
                        'click',
                        (e) => {
                            'INPUT' === e.target.nodeName &&
                                ('1' == e.target.value
                                    ? (this.bottom =
                                          parseFloat(this.bottom) +
                                          1 +
                                          this.bottom.replace(/[\d\.]+/, ''))
                                    : '2' == e.target.value
                                    ? (this.bottom =
                                          parseFloat(this.bottom) -
                                          1 +
                                          this.bottom.replace(/[\d\.]+/, ''))
                                    : (this.bottom = '20px'),
                                this.set('bottom', this.bottom),
                                this.style({ bottom: this.bottom }))
                        }
                    ),
                    this.player.template.subtitleSettingItem[1].addEventListener(
                        'click',
                        (e) => {
                            'INPUT' === e.target.nodeName &&
                                ('1' == e.target.value
                                    ? (this.fontSize =
                                          parseFloat(this.fontSize) +
                                          1 +
                                          this.fontSize.replace(/[\d\.]+/, ''))
                                    : '2' == e.target.value
                                    ? (this.fontSize =
                                          parseFloat(this.fontSize) -
                                          1 +
                                          this.fontSize.replace(/[\d\.]+/, ''))
                                    : (this.fontSize = '40px'),
                                this.set('fontSize', this.fontSize),
                                this.style({ fontSize: this.fontSize }))
                        }
                    ),
                    (this.player.template.subtitleOffsetStep = t.query(
                        '.subtitle-offset-step',
                        this.player.template.subtitleSettingItem[2]
                    )),
                    this.player.template.subtitleOffsetStep.addEventListener(
                        'input',
                        (e) => {
                            this.offsetStep = 1 * e.target.value
                        }
                    ),
                    (this.player.template.subtitleOffset = t.query(
                        '.subtitle-offset',
                        this.player.template.subtitleSettingItem[2]
                    )),
                    this.player.template.subtitleOffset.addEventListener(
                        'input',
                        (e) => {
                            ;(this.offset = 1 * e.target.value),
                                this.subtitleOffset()
                        }
                    ),
                    this.player.template.subtitleOffset.addEventListener(
                        'dblclick',
                        (e) => {
                            0 != this.offset &&
                                ((this.offset = 0),
                                (e.target.value = 0),
                                this.subtitleOffset())
                        }
                    ),
                    this.player.template.subtitleSettingItem[2].addEventListener(
                        'click',
                        (e) => {
                            if (
                                'INPUT' === e.target.nodeName &&
                                'radio' === e.target.type
                            ) {
                                let t =
                                    (this.player.template.subtitleOffset.value *= 1)
                                '1' == e.target.value
                                    ? (t += this.offsetStep || 1)
                                    : '2' == e.target.value
                                    ? (t -= this.offsetStep || 1)
                                    : (t = 0),
                                    (this.offset = t),
                                    (this.player.template.subtitleOffset.value =
                                        t),
                                    this.subtitleOffset()
                            }
                        }
                    ),
                    (this.player.template.subtitleLocalFile = t.append(
                        this.player.template.container,
                        '<input class="subtitleLocalFile" type="file" accept="webvtt,.vtt,.srt,.ssa,.ass" style="display: none;">'
                    )),
                    this.player.template.subtitleSettingItem[3].addEventListener(
                        'click',
                        (e) => {
                            'INPUT' === e.target.nodeName &&
                                '1' == e.target.value &&
                                (this.player.template.subtitleLocalFile.click(),
                                this.hide())
                        }
                    ),
                    this.player.template.subtitleLocalFile.addEventListener(
                        'change',
                        (e) => {
                            if (e.target.files.length) {
                                const t = e.target.files[0],
                                    s = t.name.split('.').pop().toLowerCase()
                                this.blobToText(t).then((e) => {
                                    let t = { url: '' }
                                    ;(t.sarr = this.subParser(e, s)),
                                        (t.lang = this.getlangBySarr(t.sarr)),
                                        (t.name =
                                            t.name || this.langToLabel(t.lang)),
                                        this.add([t]),
                                        this.switch(t)
                                })
                            }
                            e.target.value = ''
                        }
                    )
                const s = this.player.template.subtitlesItem.length - 1
                this.player.template.subtitlesItem[s].addEventListener(
                    'click',
                    () => {
                        ;(this.player.options.subtitle.index = s),
                            (this.player.template.subtitle.innerHTML =
                                '<p></p>'),
                            this.player.subtitles.subContainerHide()
                    }
                ),
                    this.style({
                        color: this.color,
                        bottom: this.bottom,
                        fontSize: this.fontSize,
                    })
            }
            add(e) {
                if (!Array.isArray(e) || !e.length) return
                if (
                    !this.player.template.subtitlesBox ||
                    !this.player.template.subtitlesItem.length
                )
                    return
                const t = this.player.template.subtitlesItem.length - 1
                e.forEach((e, s) => {
                    const i = t + s
                    this.player.options.subtitle.url.splice(i, 0, e)
                    let a = document.createElement('div')
                    a.setAttribute('class', 'dplayer-subtitles-item'),
                        (a.innerHTML =
                            '<span class="dplayer-label">' +
                            e.name +
                            ' ' +
                            (e.language || e.lang || '') +
                            '</span>'),
                        this.player.template.subtitlesBox.insertBefore(
                            a,
                            this.player.template.subtitlesBox.childNodes[i]
                        ),
                        a.addEventListener('click', (t) => {
                            this.player.subtitles.hide(),
                                this.player.options.subtitle.index !== i + 1 &&
                                    ((this.player.options.subtitle.index =
                                        i + 1),
                                    (this.player.template.subtitle.innerHTML =
                                        '<p></p>'),
                                    this.switch(e),
                                    this.player.template.subtitle.classList.contains(
                                        'dplayer-subtitle-hide'
                                    ) &&
                                        this.player.subtitles.subContainerShow())
                        })
                }),
                    (this.player.template.subtitlesItem =
                        this.player.template.subtitlesBox.querySelectorAll(
                            '.dplayer-subtitles-item'
                        )),
                    (this.player.video.textTracks.length &&
                        this.player.video.textTracks[0]?.cues &&
                        this.player.video.textTracks[0].cues.length) ||
                        ((this.player.options.subtitle.index =
                            this.player.options.subtitles.findIndex((e) =>
                                ['cho', 'chi'].includes(e.language)
                            )),
                        this.player.options.subtitle.index < 0 &&
                            (this.player.options.subtitle.index = 0),
                        this.switch(
                            this.player.options.subtitle.url[
                                this.player.options.subtitle.index
                            ]
                        ))
            }
            switch(e = {}) {
                return this.initCues(e).then((t) => {
                    e.name
                })
            }
            restart() {
                this.clear(), this.add(this.player.options.subtitles)
            }
            clear() {
                ;(this.player.template.subtitle.innerHTML = '<p></p>'),
                    (this.player.options.subtitles = []),
                    (this.player.options.subtitle.url = [])
                for (
                    let e = this.player.template.subtitlesItem.length - 2;
                    e >= 0;
                    e--
                )
                    this.player.template.subtitlesBoxPanel.removeChild(
                        this.player.template.subtitlesItem[e]
                    )
                this.player.template.subtitlesItem =
                    this.player.template.subtitlesBoxPanel.querySelectorAll(
                        '.dplayer-subtitles-item'
                    )
            }
            initCues(e) {
                return this.urlToArray(e).then((e) => this.createTrack(e))
            }
            urlToArray(e) {
                if (Array.isArray(e?.sarr) && e.sarr.length)
                    return Promise.resolve(e)
                {
                    const t = e?.url || e?.download_url || e?.uri || e?.surl,
                        s = e.sext || e.file_extension
                    return t
                        ? this.requestFile(t).then(
                              (t) => (
                                  (e.sarr = this.subParser(t, s, e.delay || 0)),
                                  (e.lang =
                                      e.lang || this.getlangBySarr(e.sarr)),
                                  (e.name = e.name || this.langToLabel(e.lang)),
                                  e
                              )
                          )
                        : Promise.reject()
                }
            }
            createTrack(e) {
                const { video: t } = this.player,
                    s = t.textTracks[0]
                if (
                    ('hidden' === s.mode || (s.mode = 'hidden'),
                    s.cues && s.cues.length)
                )
                    for (let e = s.cues.length - 1; e >= 0; e--)
                        s.removeCue(s.cues[e])
                e.sarr.forEach(function (e, t) {
                    const i = new VTTCue(e.startTime, e.endTime, e.text)
                    ;(i.id = e.index), s.addCue(i)
                })
            }
            requestFile(e) {
                return fetch(e, {
                    referrer: 'https://www.aliyundrive.com/',
                    referrerPolicy: 'origin',
                    body: null,
                    method: 'GET',
                    mode: 'cors',
                    credentials: 'omit',
                })
                    .then((e) => e.blob())
                    .then((e) => this.blobToText(e))
            }
            blobToText(e) {
                return new Promise(function (t, s) {
                    var i = new FileReader()
                    i.readAsText(e, 'UTF-8'),
                        (i.onload = function (s) {
                            var a = i.result
                            return a.indexOf('�') > -1 && !i.markGBK
                                ? ((i.markGBK = !0), i.readAsText(e, 'GBK'))
                                : a.indexOf('') > -1 && !i.markBIG5
                                ? ((i.markBIG5 = !0), i.readAsText(e, 'BIG5'))
                                : void t(a)
                        }),
                        (i.onerror = function (e) {
                            s(e)
                        })
                })
            }
            subParser(e, t, s = 0) {
                t ||
                    (t = /\d\s?-?->\s?\d/.test(e)
                        ? 'srt'
                        : /^\s*\[Script Info\]\r?\n/.test(e) &&
                          /\s*\[Events\]\r?\n/.test(e)
                        ? 'ass'
                        : '')
                var i,
                    a = [],
                    l = []
                switch (t) {
                    case 'webvtt':
                    case 'vtt':
                    case 'srt':
                        ;(i =
                            /(\d+)?\n?(\d{0,2}:?\d{2}:\d{2}.\d{3})\s?-?->\s?(\d{0,2}:?\d{2}:\d{2}.\d{3})/g),
                            (a = (e = e.replace(/\r/g, '')).split(i)).shift()
                        for (let e = 0; e < a.length; e += 4)
                            l.push({
                                index: l.length,
                                startTime: r(a[e + 1]) + +s,
                                endTime: r(a[e + 2]) + +s,
                                text: a[e + 3]
                                    .trim()
                                    .replace(/(\\N|\\n)/g, '\n')
                                    .replace(/{.*?}/g, '')
                                    .replace(/[a-z]+\:.*\d+\.\d+\%\s/, ''),
                            })
                        return l
                    case 'ssa':
                    case 'ass':
                        ;(i =
                            /Dialogue: .*?\d+,(\d+:\d{2}:\d{2}\.\d{2}),(\d+:\d{2}:\d{2}\.\d{2}),.*?,\d+,\d+,\d+,.*?,/g),
                            (a = (e = e.replace(/\r\n/g, '')).split(i)).shift()
                        for (let e = 0; e < a.length; e += 3)
                            l.push({
                                index: l.length,
                                startTime: r(a[e]) + +s,
                                endTime: r(a[e + 1]) + +s,
                                text: a[e + 2]
                                    .trim()
                                    .replace(/(\\N|\\n)/g, '\n')
                                    .replace(/{.*?}/g, ''),
                            })
                        return l
                    default:
                        return console.error('未知字幕格式，无法解析', e), l
                }
                function r(e) {
                    var t = e.split(':'),
                        s =
                            parseFloat(
                                t.length > 0
                                    ? t.pop().replace(/,/g, '.')
                                    : '00.000'
                            ) || 0,
                        i = parseFloat(t.length > 0 ? t.pop() : '00') || 0
                    return (
                        3600 *
                            (parseFloat(t.length > 0 ? t.pop() : '00') || 0) +
                        60 * i +
                        s
                    )
                }
            }
            getlangBySarr(e) {
                var t = [
                        e[parseInt(e.length / 3)].text,
                        e[parseInt(e.length / 2)].text,
                        e[parseInt((e.length / 3) * 2)].text,
                    ]
                        .join('')
                        .replace(/[<bi\/>\r?\n]*/g, ''),
                    s = 'eng',
                    i = (t.match(/[\u4e00-\u9fa5]/g) || []).length / t.length
                return (
                    (
                        t.match(
                            /[\u3020-\u303F]|[\u3040-\u309F]|[\u30A0-\u30FF]|[\u31F0-\u31FF]/g
                        ) || []
                    ).length /
                        t.length >
                    0.03
                        ? (s = 'jpn')
                        : i > 0.1 && (s = 'zho'),
                    s
                )
            }
            langToLabel(e) {
                return (
                    {
                        chi: '中文字幕',
                        zho: '中文字幕',
                        eng: '英文字幕',
                        en: '英文字幕',
                        jpn: '日文字幕',
                        'zh-CN': '简体中文',
                        'zh-TW': '繁体中文',
                    }[e] || '未知语言'
                )
            }
            subtitleOffset() {
                const { video: e, subtitle: t, events: s } = this.player,
                    i = e.textTracks[0]
                if (i && i.cues) {
                    const e = Array.from(i.cues),
                        t = this.player.options.subtitle.url.find(
                            (t) =>
                                t.sarr &&
                                t.sarr[parseInt(t.sarr.length / 2)].text ===
                                    e[parseInt(e.length / 2)].text
                        )?.sarr
                    if (!t) return
                    for (let s = 0; s < e.length; s++) {
                        const i = e[s]
                        ;(i.startTime = t[s].startTime + this.offset),
                            (i.endTime = t[s].endTime + this.offset)
                    }
                    s.trigger('subtitle_change'),
                        this.player.notice(`字幕偏移: ${this.offset} 秒`)
                } else this.offset = 0
            }
            toggle() {
                this.player.template.subtitleCommentSettingBox.classList.contains(
                    'dplayer-comment-setting-open'
                )
                    ? this.hide()
                    : this.show()
            }
            show() {
                this.player.template.subtitleCommentSettingBox.classList.add(
                    'dplayer-comment-setting-open'
                ),
                    this.player.template.mask.classList.add('dplayer-mask-show')
            }
            hide() {
                this.player.template.subtitleCommentSettingBox.classList.remove(
                    'dplayer-comment-setting-open'
                ),
                    this.player.template.settingBox.classList.remove(
                        'dplayer-setting-box-open'
                    ),
                    this.player.template.mask.classList.remove(
                        'dplayer-mask-show'
                    )
            }
            get(e) {
                return localStorage.getItem('dplayer-subtitle-' + e)
            }
            set(e, t) {
                e && t && localStorage.setItem('dplayer-subtitle-' + e, t)
            }
            style(e, t) {
                const { subtitle: s } = this.player.template
                if ('object' == typeof e) {
                    for (const t in e) s.style[t] = e[t]
                    return s
                }
                return (s.style[e] = t), s
            }
        },
        class Libass {
            constructor(e, t) {
                ;(this.player = e),
                    (this.loadJs = t.loadJs),
                    (this.libass = null),
                    (this.fontData = null),
                    (this.hasSubtitleTrack = !1),
                    (this.hasSubtitleDisplay = !1),
                    (this.offset = 0),
                    (this.offsetStep = 1),
                    (this.color = -256),
                    (this.fontSize = 20),
                    (this.bottom = 10),
                    Object.assign(this.player.user.storageName, {
                        specialsubtitle: 'dplayer-specialsubtitle',
                    }),
                    Object.assign(this.player.user.default, {
                        specialsubtitle: 0,
                    }),
                    this.player.user.init(),
                    (this.specialsubtitle =
                        this.player.user.get('specialsubtitle')),
                    this.specialsubtitle &&
                        ((this.player.template.subtitleSpecial = t.append(
                            t.query(
                                '.dplayer-setting-origin-panel',
                                this.player.template.settingBox
                            ),
                            '<div class="dplayer-setting-item dplayer-setting-specialsubtitle"><span class="dplayer-label">特效字幕</span><div class="dplayer-toggle"><input class="dplayer-toggle-setting-input" type="checkbox" name="dplayer-toggle"><label for="dplayer-toggle"></label></div></div>'
                        )),
                        (this.player.template.subtitleSpecialToggle = t.query(
                            'input',
                            this.player.template.subtitleSpecial
                        )),
                        (this.player.template.subtitleSpecialToggle.checked =
                            this.specialsubtitle),
                        this.player.template.subtitleSpecial.addEventListener(
                            'click',
                            () => {
                                ;(this.specialsubtitle =
                                    this.player.template.subtitleSpecialToggle.checked =
                                        !this.player.template
                                            .subtitleSpecialToggle.checked),
                                    this.player.user.set(
                                        'specialsubtitle',
                                        Number(this.specialsubtitle)
                                    ),
                                    this.player.notice(
                                        '特效字幕： ' +
                                            (this.specialsubtitle
                                                ? '开启'
                                                : '关闭')
                                    ),
                                    this.specialsubtitle || location.reload()
                            }
                        ),
                        this.player.events.type('subtitle_end') ||
                            e.events.playerEvents.push('subtitle_end'),
                        this.player.on('subtitle_end', () => {
                            this.add(this.player.options.subtitles)
                        }),
                        this.player.on('quality_end', () => {
                            this.setVideo(),
                                this.player.options.subtitle.url.length &&
                                this.player.options.subtitles.length
                                    ? this.switch(
                                          this.player.options.subtitles[
                                              this.player.options.subtitle.index
                                          ]
                                      )
                                    : this.hasSubtitleDisplay ||
                                      ((this.hasSubtitleDisplay = !0),
                                      this.player.events.trigger(
                                          'subtitle_start'
                                      ))
                        }),
                        this.player.on('episode_end', () => {
                            ;(this.hasSubtitleTrack = !1),
                                (this.hasSubtitleDisplay = !1),
                                this.clear()
                        }),
                        this.player.template.mask.addEventListener(
                            'click',
                            () => {
                                this.hide()
                            }
                        ),
                        (this.player.template.subtitleSettingBox = t.append(
                            this.player.template.controller,
                            '<div class="dplayer-icons dplayer-comment-box subtitle-setting-box" style="bottom: 10px;left: auto;right: 400px !important;display: block;"><div class="dplayer-comment-setting-box"><div class="dplayer-comment-setting-color"><div class="dplayer-comment-setting-title">字幕颜色<button type="text" class="color-custom" style="line-height: 16px;font-size: 12px;top: 12px;right: 12px;color: #fff;background: rgba(28, 28, 28, 0.9);position: absolute;">自定义</button></div><label><input type="radio" name="dplayer-danmaku-color-1" value="#fff"><span style="background: #fff;"></span></label><label><input type="radio" name="dplayer-danmaku-color-1" value="#e54256"><span style="background: #e54256"></span></label><label><input type="radio" name="dplayer-danmaku-color-1" value="#ffe133"><span style="background: #ffe133"></span></label><label><input type="radio" name="dplayer-danmaku-color-1" value="#64DD17"><span style="background: #64DD17"></span></label><label><input type="radio" name="dplayer-danmaku-color-1" value="#39ccff"><span style="background: #39ccff"></span></label><label><input type="radio" name="dplayer-danmaku-color-1" value="#D500F9"><span style="background: #D500F9"></span></label></div><div class="dplayer-comment-setting-type"><div class="dplayer-comment-setting-title">字幕位置</div><label><input type="radio" name="dplayer-danmaku-type-1" value="1"><span>上移</span></label><label><input type="radio" name="dplayer-danmaku-type-1" value="0"><span>默认</span></label><label><input type="radio" name="dplayer-danmaku-type-1" value="2"><span>下移</span></label></div><div class="dplayer-comment-setting-type"><div class="dplayer-comment-setting-title">字幕大小</div><label><input type="radio" name="dplayer-danmaku-type-1" value="1"><span>加大</span></label><label><input type="radio" name="dplayer-danmaku-type-1" value="0"><span>默认</span></label><label><input type="radio" name="dplayer-danmaku-type-1" value="2"><span>减小</span></label></div><div class="dplayer-comment-setting-type"><div class="dplayer-comment-setting-title">字幕偏移<div style="margin-top: -30px;right: 14px;position: absolute;">偏移量<input type="number" class="subtitle-offset-step" style="height: 14px;width: 50px;margin-left: 4px;border: 1px solid #fff;border-radius: 3px;color: #fff;background: rgba(28, 28, 28, 0.9);text-align: center;" value="1" step="1" min="1"></div></div><label><input type="radio" name="dplayer-danmaku-type-1" value="1"><span>前移</span></label><label><span><input type="text" class="subtitle-offset" style="width: 94%;height: 14px;background: rgba(28, 28, 28, 0.9);border: 0px solid #fff;text-align: center;" value="0" title="双击恢复默认"></span></label><label><input type="radio" name="dplayer-danmaku-type-1" value="2"><span>后移</span></label></div><div class="dplayer-comment-setting-type"><div class="dplayer-comment-setting-title">更多字幕功能</div><label><input type="radio" name="dplayer-danmaku-type-1" value="1"><span>本地字幕</span></label><label><input type="radio" name="dplayer-danmaku-type-1" value="0"><span>待定</span></label><label><input type="radio" name="dplayer-danmaku-type-1" value="2"><span>待定</span></label></div></div></div>'
                        )),
                        (this.player.template.subtitleCommentSettingBox =
                            t.query(
                                '.dplayer-comment-setting-box',
                                this.player.template.subtitleSettingBox
                            )),
                        (this.player.template.subtitleSetting = t.append(
                            t.query(
                                '.dplayer-setting-origin-panel',
                                this.player.template.settingBox
                            ),
                            '<div class="dplayer-setting-item dplayer-setting-subtitle"><span class="dplayer-label">字幕设置</span><div class="dplayer-toggle"><svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 32 32"><path d="M22 16l-10.105-10.6-1.895 1.987 8.211 8.613-8.211 8.612 1.895 1.988 8.211-8.613z"></path></svg></div></div>'
                        )),
                        this.player.template.subtitleSetting.addEventListener(
                            'click',
                            () => {
                                this.toggle()
                            }
                        ),
                        (this.player.template.subtitleColorPicker = t.append(
                            this.player.template.container,
                            '<input type="color" id="colorPicker">'
                        )),
                        (this.player.template.subtitleColorCustom = t.query(
                            '.color-custom',
                            this.player.template.subtitleCommentSettingBox
                        )),
                        this.player.template.subtitleColorCustom.addEventListener(
                            'click',
                            () => {
                                ;(this.player.template.subtitleColorPicker.value =
                                    this.color),
                                    this.player.template.subtitleColorPicker.click()
                            }
                        ),
                        this.player.template.subtitleColorPicker.addEventListener(
                            'input',
                            (e) => {
                                const t = e.target.value
                                ;(this.color = this.fromQColor(t)),
                                    this.player.notice(
                                        `设置字幕颜色: ${this.color}`
                                    ),
                                    this.setStyle({ PrimaryColour: this.color })
                            }
                        ),
                        (this.player.template.subtitleSettingColor = t.query(
                            '.dplayer-comment-setting-color',
                            this.player.template.subtitleCommentSettingBox
                        )),
                        this.player.template.subtitleSettingColor.addEventListener(
                            'click',
                            (e) => {
                                if ('INPUT' === e.target.nodeName) {
                                    const t = e.target.value
                                    ;(this.color = this.fromQColor(t)),
                                        this.player.notice(
                                            `设置字幕颜色: ${this.color}`
                                        ),
                                        this.setStyle({
                                            PrimaryColour: this.color,
                                        })
                                }
                            }
                        ),
                        (this.player.template.subtitleSettingItem = t.queryAll(
                            '.dplayer-comment-setting-type',
                            this.player.template.subtitleCommentSettingBox
                        )),
                        this.player.template.subtitleSettingItem[0].addEventListener(
                            'click',
                            (e) => {
                                'INPUT' === e.target.nodeName &&
                                    ('1' == e.target.value
                                        ? (this.bottom += 1)
                                        : '2' == e.target.value
                                        ? (this.bottom -= 1)
                                        : (this.bottom = 10),
                                    this.player.notice(
                                        `设置字幕位置: ${this.bottom}`
                                    ),
                                    this.setStyle({ MarginV: this.bottom }))
                            }
                        ),
                        this.player.template.subtitleSettingItem[1].addEventListener(
                            'click',
                            (e) => {
                                'INPUT' === e.target.nodeName &&
                                    ('1' == e.target.value
                                        ? (this.fontSize += 1)
                                        : '2' == e.target.value
                                        ? (this.fontSize -= 1)
                                        : (this.fontSize = 20),
                                    this.player.notice(
                                        `设置字幕大小: ${this.fontSize}`
                                    ),
                                    this.setStyle({ FontSize: this.fontSize }))
                            }
                        ),
                        (this.player.template.subtitleOffsetStep = t.query(
                            '.subtitle-offset-step',
                            this.player.template.subtitleSettingItem[2]
                        )),
                        this.player.template.subtitleOffsetStep.addEventListener(
                            'input',
                            (e) => {
                                this.offsetStep = 1 * e.target.value
                            }
                        ),
                        (this.player.template.subtitleOffset = t.query(
                            '.subtitle-offset',
                            this.player.template.subtitleSettingItem[2]
                        )),
                        this.player.template.subtitleOffset.addEventListener(
                            'input',
                            (e) => {
                                ;(this.offset = 1 * e.target.value),
                                    this.subtitleOffset()
                            }
                        ),
                        this.player.template.subtitleOffset.addEventListener(
                            'dblclick',
                            (e) => {
                                0 != this.offset &&
                                    ((this.offset = 0),
                                    (e.target.value = 0),
                                    this.player.notice(
                                        `设置字幕偏移: ${this.offset}`
                                    ),
                                    this.timeOffset())
                            }
                        ),
                        this.player.template.subtitleSettingItem[2].addEventListener(
                            'click',
                            (e) => {
                                if (
                                    'INPUT' === e.target.nodeName &&
                                    'radio' === e.target.type
                                ) {
                                    let t =
                                        (this.player.template.subtitleOffset.value *= 1)
                                    '1' == e.target.value
                                        ? (t += this.offsetStep || 1)
                                        : '2' == e.target.value
                                        ? (t -= this.offsetStep || 1)
                                        : (t = 0),
                                        (this.offset = t),
                                        (this.player.template.subtitleOffset.value =
                                            t),
                                        this.player.notice(
                                            `设置字幕偏移: ${this.offset}`
                                        ),
                                        this.timeOffset()
                                }
                            }
                        ),
                        (this.player.template.subtitleLocalFile = t.append(
                            this.player.template.container,
                            '<input class="subtitleLocalFile" type="file" accept="webvtt,.vtt,.srt,.ssa,.ass" style="display: none;">'
                        )),
                        this.player.template.subtitleSettingItem[3].addEventListener(
                            'click',
                            (e) => {
                                'INPUT' === e.target.nodeName &&
                                    '1' == e.target.value &&
                                    (this.player.template.subtitleLocalFile.click(),
                                    this.hide())
                            }
                        ),
                        this.player.template.subtitleLocalFile.addEventListener(
                            'change',
                            (e) => {
                                if (e.target.files.length) {
                                    const t = e.target.files[0],
                                        s = t.name
                                            .split('.')
                                            .pop()
                                            .toLowerCase()
                                    this.blobToText(t).then((e) => {
                                        let t = {
                                            stext: e,
                                            sext: s,
                                            name: '本地字幕',
                                        }
                                        this.add([t]), this.switch(t)
                                    })
                                }
                                e.target.value = ''
                            }
                        ),
                        this.player.events.trigger('subtitle_start'),
                        this.player.on('destroy', () => {
                            this.destroy()
                        }))
            }
            add(e) {
                if (!Array.isArray(e) || !e.length) return
                if (
                    !this.player.template.subtitlesBox ||
                    !this.player.template.subtitlesItem.length
                )
                    return
                this.player.template.subtitlesBoxPanel ||
                    (this.player.template.subtitlesBoxPanel =
                        this.player.template.subtitlesBox.querySelector(
                            '.dplayer-subtitles-panel'
                        ))
                const t = this.player.template.subtitlesItem.length - 1
                if (
                    (e.forEach((e, s) => {
                        const i = t + s
                        this.player.options.subtitle.url.splice(i, 0, e)
                        let a = document.createElement('div')
                        a.setAttribute('class', 'dplayer-subtitles-item'),
                            (a.innerHTML =
                                '<span class="dplayer-label">' +
                                e.name +
                                ' ' +
                                (e.language || e.lang || '') +
                                '</span>'),
                            this.player.template.subtitlesBoxPanel.insertBefore(
                                a,
                                this.player.template.subtitlesBoxPanel
                                    .childNodes[i]
                            ),
                            a.addEventListener('click', (t) => {
                                this.player.subtitles.hide(),
                                    this.player.options.subtitle.index !==
                                        i + 1 &&
                                        ((this.player.options.subtitle.index =
                                            i + 1),
                                        this.switch(e))
                            })
                    }),
                    (this.player.template.subtitlesItem =
                        this.player.template.subtitlesBoxPanel.querySelectorAll(
                            '.dplayer-subtitles-item'
                        )),
                    !this.hasSubtitleTrack)
                ) {
                    ;(this.hasSubtitleTrack = !0),
                        this.player.template.subtitlesItem[
                            this.player.template.subtitlesItem.length - 1
                        ].addEventListener('click', (e) => {
                            this.subContainerHide()
                        })
                    let e = this.player.options.subtitles.findIndex((e) =>
                        ['cho', 'zhi'].includes(e.language)
                    )
                    e < 0 && (e = 0),
                        this.init(this.player.options.subtitle.url[e]),
                        (this.player.options.subtitle.index = e + 1)
                }
            }
            init(e) {
                return this.initLibass()
                    .then(() =>
                        this.urlToText(e).then(
                            (e) => (
                                ['ass', 'ssa'].includes(e.sext) ||
                                    Object.assign(e, {
                                        stext: this.toAss(e.stext, e.sext),
                                        sext: 'ass',
                                    }),
                                this.switchContent(e.stext),
                                this.subContainerShow(),
                                e
                            )
                        )
                    )
                    .catch((e) => {
                        console.error('加载特效字幕组件 错误！', e)
                    })
            }
            switch(e = {}) {
                return this.init(e).then(() => {
                    e.name && this.player.notice(`切换字幕: ${e.name}`)
                })
            }
            clear() {
                ;(this.player.options.subtitles = []),
                    (this.player.options.subtitle.url = [])
                for (
                    let e = this.player.template.subtitlesItem.length - 2;
                    e >= 0;
                    e--
                )
                    this.player.template.subtitlesBoxPanel.removeChild(
                        this.player.template.subtitlesItem[e]
                    )
                ;(this.player.template.subtitlesItem =
                    this.player.template.subtitlesBoxPanel.querySelectorAll(
                        '.dplayer-subtitles-item'
                    )),
                    this.destroy()
            }
            toggle() {
                this.player.template.subtitleCommentSettingBox.classList.contains(
                    'dplayer-comment-setting-open'
                )
                    ? this.hide()
                    : this.show()
            }
            show() {
                this.player.template.subtitleCommentSettingBox.classList.add(
                    'dplayer-comment-setting-open'
                ),
                    this.player.template.mask.classList.add('dplayer-mask-show')
            }
            hide() {
                this.player.template.subtitleCommentSettingBox.classList.remove(
                    'dplayer-comment-setting-open'
                ),
                    this.player.template.settingBox.classList.remove(
                        'dplayer-setting-box-open'
                    ),
                    this.player.template.mask.classList.remove(
                        'dplayer-mask-show'
                    )
            }
            initLibass() {
                if (this.libass) return Promise.resolve(this.libass)
                const e = {
                    video: this.player.template.video,
                    subContent: '[Script Info]\nScriptType: v4.00+',
                    subUrl: '',
                    availableFonts: {
                        '思源黑体 cn bold':
                            'https://cdn.jsdelivr.net/gh/tampermonkeyStorage/Self-use@main/Fonts/SourceHanSansCN-Bold.woff2',
                    },
                }
                return this.getLocalFonts().then(
                    (t) => {
                        const s = t.filter((e) =>
                                e.fullName.match(/[\u4e00-\u9fa5]/)
                            ),
                            i =
                                s.find((e) =>
                                    ['微软雅黑'].some((t) => e?.fullName === t)
                                )?.fullName ||
                                s.sort(() => 0.5 - Math.random())[0]?.fullName
                        return (
                            Object.assign(e, {
                                useLocalFonts: !0,
                                fallbackFont: i,
                            }),
                            this.loadLibass(e)
                        )
                    },
                    () =>
                        this.getDbFonts().then((t) => {
                            ;(t || []).forEach(({ fullName: t, font: s }) => {
                                e.availableFonts[t] = s
                            })
                            const s =
                                Object.keys(e.availableFonts).find((e) =>
                                    ['思源黑体 cn bold'].some((t) => t === e)
                                ) ||
                                Object.keys(e.availableFonts)
                                    .filter((e) => e.match(/[\u4e00-\u9fa5]/))
                                    .filter(Boolean)
                                    .sort(() => 0.5 - Math.random())[0]
                            return (
                                Object.assign(e, { fallbackFont: s }),
                                this.loadLibass(e)
                            )
                        })
                )
            }
            loadLibass(e) {
                let t =
                    'https://registry.npmmirror.com/jassub/1.7.15/files/dist/jassub.umd.js'
                return this.loadJs(t).then(
                    () => (
                        Object.assign(e, {
                            workerUrl: new URL('jassub-worker.js', t).href,
                            wasmUrl: new URL('jassub-worker.wasm', t).href,
                            legacyWorkerUrl: new URL('jassub-worker.wasm.js', t)
                                .href,
                            modernWasmUrl: new URL(
                                'jassub-worker-modern.wasm',
                                t
                            ).href,
                        }),
                        this.loadWorker(e).then(
                            (t) => (
                                (e.workerUrl = t),
                                (this.libass = new unsafeWindow.JASSUB(e)),
                                this.libass
                            )
                        )
                    )
                )
            }
            loadWorker({ workerUrl: e }) {
                return fetch(e)
                    .then((e) => e.text())
                    .then((e) => {
                        const t = new Blob([e], { type: 'text/javascript' }),
                            s = URL.createObjectURL(t)
                        return (
                            setTimeout(() => {
                                URL.revokeObjectURL(s)
                            }),
                            s
                        )
                    })
            }
            setVideo(e) {
                this.libass &&
                    this.libass.setVideo(e || this.player.template.video)
            }
            switchContent(e) {
                this.libass &&
                    e &&
                    (this.libass.freeTrack(), this.libass.setTrack(e))
            }
            subContainerShow() {
                this.libass &&
                    (((
                        this.libass.canvasParent || this.libass._canvasParent
                    ).style.display = 'block'),
                    this.libass.resize())
            }
            subContainerHide() {
                this.libass &&
                    ((
                        this.libass.canvasParent || this.libass._canvasParent
                    ).style.display = 'none')
            }
            timeOffset(e) {
                this.libass && (this.libass.timeOffset = e || this.offset)
            }
            getStyles(e) {
                this.libass
                    ? this.libass.getStyles((t, s) => {
                          e && e(s || t)
                      })
                    : e && e('')
            }
            setStyle(e, t = 1) {
                this.libass && this.libass.setStyle(e, t)
            }
            destroy() {
                this.libass &&
                    (this.libass.destroy && this.libass.destroy(),
                    this.libass.dispose && this.libass.dispose(),
                    (this.libass = null))
            }
            getLocalFonts(e) {
                if (unsafeWindow.queryLocalFonts) {
                    const t = {}
                    return (
                        e && (t.postscriptNames = Array.isArray(e) ? e : [e]),
                        unsafeWindow
                            .queryLocalFonts(t)
                            .then((e) => (e && e.length ? e : Promise.reject()))
                    )
                }
                return console.warn('Not Local fonts API'), Promise.reject()
            }
            getDbFonts(e) {
                const t = window.localforage || unsafeWindow.localforage
                return t.getItem('local-fonts').then((s) => {
                    if (Array.isArray(s) && s.length)
                        return Array.isArray(e)
                            ? s.filter(({ fullName: t }) =>
                                  e.some((e) => e === t)
                              )
                            : s
                    let i = [
                        {
                            fullName: '思源黑体 cn bold',
                            url: 'https://cdn.jsdelivr.net/gh/tampermonkeyStorage/Self-use@main/Fonts/SourceHanSansCN-Bold.woff2',
                        },
                    ]
                    Array.isArray(e) &&
                        (i = i.filter(({ fullName: t }) =>
                            e.some((e) => e === t)
                        ))
                    const a = []
                    return (
                        i.forEach(({ url: e }) => {
                            e &&
                                a.push(
                                    fetch(e).then((e) =>
                                        e.ok
                                            ? e.arrayBuffer()
                                            : Promise.reject()
                                    )
                                )
                        }),
                        Promise.allSettled(a).then(
                            (e) => (
                                e.forEach(({ status: e, value: t }, s) => {
                                    'fulfilled' == e &&
                                        t?.byteLength &&
                                        Object.assign(i[s], {
                                            font: new Uint8Array(t),
                                        })
                                }),
                                t.setItem(
                                    'local-fonts',
                                    (s || []).concat(
                                        i.filter(({ font: e }) => e)
                                    )
                                )
                            )
                        )
                    )
                })
            }
            toAss(e, t) {
                const s = 'ass' === t || 'ssa' === t ? e : ''
                if (s) return s
                const i =
                        /(?:\d+\n)?(\d{0,2}:?\d{2}:\d{2}.\d{3})\s?-?->\s?(\d{0,2}:?\d{2}:\d{2}.\d{3})(.*)\n([\s\S]*)$/i,
                    a = (e) => {
                        const t = [],
                            s = e.replace(/\r/g, ''),
                            a = /(\d{0,2})?:?(\d{2}):(\d{2}.\d{3})/
                        for (const e of s.split('\n\n')) {
                            const s = e.match(i)
                            if (s) {
                                ;(s[1] = s[1].replace(
                                    a,
                                    (e, t, s, i) =>
                                        (t || '0') +
                                        ':' +
                                        s +
                                        ':' +
                                        i
                                            .match(/\d{2}.\d{2}/)[0]
                                            .replace(',', '.')
                                )),
                                    (s[2] = s[2].replace(
                                        a,
                                        (e, t, s, i) =>
                                            (t || '0') +
                                            ':' +
                                            s +
                                            ':' +
                                            i
                                                .match(/\d{2}.\d{2}/)[0]
                                                .replace(',', '.')
                                    ))
                                const e = s[4].match(/<[^>]+>/g)
                                e &&
                                    e.forEach((e) => {
                                        ;/<\//.test(e)
                                            ? (s[4] = s[4].replace(
                                                  e,
                                                  e
                                                      .replace('</', '{\\')
                                                      .replace('>', '0}')
                                              ))
                                            : (s[4] = s[4].replace(
                                                  e,
                                                  e
                                                      .replace('<', '{\\')
                                                      .replace('>', '1}')
                                              ))
                                    }),
                                    t.push(
                                        'Dialogue: 0,' +
                                            s[1] +
                                            ',' +
                                            s[2] +
                                            ',Default,,0,0,0,,' +
                                            s[4].replace(/\n/g, '\\N')
                                    )
                            }
                        }
                        return t.join('\n')
                    },
                    l = {
                        scriptInfo: {
                            Title: 'untitled',
                            ScriptType: 'v4.00+',
                            Collisions: 'Normal',
                            PlayDepth: 0,
                            Timer: '100,0000',
                            PlayResX: '',
                            PlayResY: '',
                            WrapStyle: 0,
                            ScaledBorderAndShadow: 'no',
                        },
                        v4Styles: [
                            {
                                Name: 'Default',
                                Fontname: 'Default',
                                Fontsize: 20,
                                PrimaryColour: '&H00FFFFFF',
                                SecondaryColour: '&H00FFFFFF',
                                OutlineColour: '&H00000000',
                                BackColour: '&H00000000',
                                Bold: -1,
                                Italic: 0,
                                Underline: 0,
                                StrikeOut: 0,
                                ScaleX: 100,
                                ScaleY: 100,
                                Spacing: 0,
                                Angle: 0,
                                BorderStyle: 1,
                                Outline: 1,
                                Shadow: 0,
                                Alignment: 2,
                                MarginL: 10,
                                MarginR: 10,
                                MarginV: 10,
                                Encoding: 1,
                            },
                        ],
                    },
                    r = ['[Script Info]']
                for (let [e, t] of Object.entries(l.scriptInfo))
                    r.push(e + ': ' + t)
                r.push(''),
                    r.push('[V4+ Styles]'),
                    r.push(
                        'Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding'
                    ),
                    l.v4Styles.forEach((e) => {
                        'object' == typeof e
                            ? r.push('Style: ' + Object.values(e).join(','))
                            : 'string' == typeof e && r.push(e)
                    }),
                    r.push(''),
                    r.push('[Events]'),
                    r.push(
                        'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text'
                    ),
                    r.push('')
                const n = r.join('\n')
                switch (t) {
                    case 'vtt':
                    case 'srt':
                        return n + a(e)
                    case 'ssa':
                    case 'ass':
                        return s
                    default:
                        return i.test(e) ? n + a(e) : ''
                }
            }
            urlToText(e) {
                if (e.stext) return Promise.resolve(e)
                {
                    e.sext || (e.sext = e.file_extension)
                    const t = e.url || e.download_url || e.uri || e.surl
                    return this.requestFile(t).then((t) => ((e.stext = t), e))
                }
            }
            requestFile(e) {
                return fetch(e, {
                    referrer: location.protocol + '//' + location.host + '/',
                    referrerPolicy: 'origin',
                    body: null,
                    method: 'GET',
                    mode: 'cors',
                    credentials: 'omit',
                })
                    .then((e) => e.blob())
                    .then((e) => this.blobToText(e))
            }
            blobToText(e) {
                return new Promise(function (t, s) {
                    var i = new FileReader()
                    i.readAsText(e, 'UTF-8'),
                        (i.onload = function (s) {
                            var a = i.result
                            return a.indexOf('�') > -1 && !i.markGBK
                                ? ((i.markGBK = !0), i.readAsText(e, 'GBK'))
                                : a.indexOf('') > -1 && !i.markBIG5
                                ? ((i.markBIG5 = !0), i.readAsText(e, 'BIG5'))
                                : void t(a)
                        }),
                        (i.onerror = function (e) {
                            s(e)
                        })
                })
            }
            fromQColor(e, t = !1) {
                e = e.replace(
                    /^#?([a-f\d])([a-f\d])([a-f\d])$/i,
                    (e, t, s, i) => t + t + s + s + i + i
                )
                const [s, i, a, l] =
                    /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e)
                return t
                    ? (((-1 + i) & 255) << 24) |
                          (((-1 + a) & 255) << 16) |
                          (((-1 + l) & 255) << 8) |
                          0
                    : (('0x' + i) << 24) |
                          (('0x' + a) << 16) |
                          (('0x' + l) << 8) |
                          0
            }
        },
        class Appreciation {
            constructor(e, t) {
                ;(this.player = e),
                    (this.now = Date.now()),
                    (this.localforage =
                        window.localforage || unsafeWindow.localforage)
                const {
                    contextmenu: s,
                    container: { offsetWidth: i, offsetHeight: a },
                } = this.player
                this.player.template.menuItem[0].addEventListener(
                    'click',
                    () => {
                        this.showDialog()
                    }
                ),
                    this.player.on('timeupdate', () => {
                        Date.now() - 99e9 >= this.now &&
                            ((this.now = Date.now()),
                            this.isAppreciation()
                                .then((e) => {
                                    this.player.plugins.hls.data = true
                                }))
                    }),
                    this.player.template.settingBox.addEventListener(
                        'click',
                        (e) => {
                            this.isAppreciation().catch((t) => {
                                let s =
                                    e.target.querySelector('input') ||
                                    e.target.parentNode.querySelector('input')
                                s && s.checked && e.target.click(),
                                    this.player.template.mask.click(),
                                    e.isTrusted && this.showDialog()
                            })
                        }
                    )
            }
            isAppreciation() {
                return (
                    (this.player.template.menuItem =
                        this.player.container.querySelectorAll(
                            '.dplayer-menu-item'
                        )),
                    this.player.template.menu.innerHTML.includes(5254001) ||
                        4 === this.player.template.menuItem.length,
                    this.localforage,
                    GM_getValue || GM_setValue || GM_deleteValue,
                    this.localforage
                        .getItem('users')
                        .then((e) =>
                            e?.expire_time
                                ? this.localforage
                                      .getItem('users_sign')
                                      .then((t) =>
                                          Math.max(
                                              Date.parse(e.expire_time) -
                                                  Date.now(),
                                              0
                                          ) &&
                                          t ===
                                              btoa(
                                                  encodeURIComponent(
                                                      JSON.stringify(e)
                                                  )
                                              ) &&
                                          GM_getValue('users_sign') ===
                                              btoa(
                                                  encodeURIComponent(
                                                      JSON.stringify(e)
                                                  )
                                              )
                                              ? e
                                              : this.usersPost().then((e) =>
                                                    Math.max(
                                                        Date.parse(
                                                            e?.expire_time
                                                        ) - Date.now(),
                                                        0
                                                    )
                                                        ? this.localforage
                                                              .setItem(
                                                                  'users',
                                                                  e
                                                              )
                                                              .then(
                                                                  (e) => (
                                                                      this.localforage.setItem(
                                                                          'users_sign',
                                                                          btoa(
                                                                              encodeURIComponent(
                                                                                  JSON.stringify(
                                                                                      e
                                                                                  )
                                                                              )
                                                                          )
                                                                      ),
                                                                      GM_setValue(
                                                                          'users_sign',
                                                                          btoa(
                                                                              encodeURIComponent(
                                                                                  JSON.stringify(
                                                                                      e
                                                                                  )
                                                                              )
                                                                          )
                                                                      ),
                                                                      e
                                                                  )
                                                              )
                                                        : (this.localforage.removeItem(
                                                              'users'
                                                          ),
                                                          this.localforage.removeItem(
                                                              'users_sign'
                                                          ),
                                                          GM_deleteValue(
                                                              'users_sign'
                                                          ),
                                                          Promise.reject())
                                                )
                                      )
                                : GM_getValue('users_sign')
                                ? this.localforage
                                      .setItem('users', {
                                          expire_time: new Date().toISOString(),
                                      })
                                      .then(() => this.isAppreciation())
                                : (GM_setValue('users_sign', 0),
                                  Promise.reject())
                        )
                )
            }
            showDialog() {

            }
            onPost(e) {
                return this.usersPost().then(
                    (t) => (
                        0 === Date.parse(t.expire_time) ||
                            this.localforage
                                .setItem(
                                    'users',
                                    Object.assign(t || {}, {
                                        expire_time: new Date(
                                            Date.now() + 864e3
                                        ).toISOString(),
                                    })
                                )
                                .then((e) => {
                                    this.localforage.setItem(
                                        'users_sign',
                                        btoa(
                                            encodeURIComponent(
                                                JSON.stringify(e)
                                            )
                                        )
                                    ),
                                        GM_setValue(
                                            'users_sign',
                                            btoa(
                                                encodeURIComponent(
                                                    JSON.stringify(e)
                                                )
                                            )
                                        )
                                }),
                        this.infoPost(t, e)
                    )
                )
            }
            usersPost() {
                return this.users(this.getItem('token'))
            }
            users(e) {
                return this.ajax({
                    url: 'https://sxxf4ffo.lc-cn-n1-shared.com/1.1/users',
                    data: JSON.stringify({
                        authData: {
                            aliyundrive: Object.assign(e, {
                                uid: e?.user_id,
                                scriptHandler: GM_info?.scriptHandler,
                                version: GM_info?.script?.version,
                            }),
                        },
                    }),
                })
            }
            infoPost(e, t) {
                return (
                    delete e.createdAt,
                    delete e.updatedAt,
                    delete e.objectId,
                    this.ajax({
                        url: 'https://sxxf4ffo.lc-cn-n1-shared.com/1.1/classes/aliyundrive',
                        data: JSON.stringify(Object.assign(e, { ON: t })),
                    })
                )
            }
            ajax(e) {
                return new Promise(function (t, s) {
                    GM_xmlhttpRequest
                        ? GM_xmlhttpRequest({
                              method: 'post',
                              headers: {
                                  'Content-Type': 'application/json',
                                  'X-LC-Id':
                                      'sXXf4FFOZn2nFIj7LOFsqpLa-gzGzoHsz',
                                  'X-LC-Key': '16s3qYecpVJXtVahasVxxq1V',
                              },
                              responseType: 'json',
                              onload: function (e) {
                                  if (2 == parseInt(e.status / 100)) {
                                      var i = e.response || e.responseText
                                      t(i)
                                  } else s(e)
                              },
                              onerror: function (e) {
                                  s(e)
                              },
                              ...e,
                          })
                        : s()
                })
            }
            getItem(e) {
                if (!(e = localStorage.getItem(e))) return null
                try {
                    return JSON.parse(e)
                } catch (t) {
                    return e
                }
            }
            setItem(e, t) {
                e &&
                    null != t &&
                    localStorage.setItem(
                        e,
                        t instanceof Object ? JSON.stringify(t) : t
                    )
            }
            removeItem(e) {
                null != e && localStorage.removeItem(e)
            }
        },
        class DoHotKey {
            constructor(e) {
                ;(this.player = e),
                    this.player.template.videoWrap.addEventListener(
                        'dblclick',
                        (e) => {
                            this.player.fullScreen.toggle()
                        }
                    ),
                    document.addEventListener('wheel', (e) => {
                        if (this.player.focus) {
                            e = e || window.event
                            var t,
                                s = this.player
                            e.deltaY < 0
                                ? ((t = s.volume() + 0.01), s.volume(t))
                                : e.deltaY > 0 &&
                                  ((t = s.volume() - 0.01), s.volume(t))
                        }
                    })
            }
        },
    ])
