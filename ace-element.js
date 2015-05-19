(function (style) {
	var snippetsList = {};
	var autoCompleteList = {};
	var optionsList = {};

	Polymer('ace-element', {
		applyAuthorStyles: true,
		mode: 'javascript',
		theme: 'monokai',
		readonly: false,
		value: null,
		wrap: false,

		observe: {
			'session.$worker.$worker' : 'updateWorker',
			'snippets' : 'updateSnippets',
			'autoComplete': 'autoComplete'
		},
		// Insert worker/JSLint options when the worker is ready
		updateWorker: function() {
			if (!this.session.$worker || !this.session.$worker.$worker) {
				return;
			}

			this.workerReady = true;

			if (this.jsHintOptions) {
				this.setJSHintOptions();
			}
		},

		setJSHintOptions: function (o) {
			this.session.$worker.$worker.postMessage({command: 'changeOptions', args: [this.jsHintOptions]});
		},

		snippetsLoaded: function(ev) {
			if (snippetsList[this.snippetsSrc]) {
				return;
			}

			snippetsList[this.snippetsSrc] = true;

			var snippetManager = ace.require("ace/snippets").snippetManager;
			snippetManager.register(snippetManager.parseSnippetFile(ev.detail.response), 'javascript');
		},

		autoCompleteSrcLoaded: function(ev) {
			if (autoCompleteList[this.autoCompleteSrc]) {
				return;
			}
			var editor = this.editor;

			autoCompleteList[this.autoCompleteSrc] = true;

			var langTools = ace.require("ace/ext/language_tools");
			var rhymeCompleter = {
				getCompletions: function(editor, session, pos, prefix, callback) {
					if (prefix.length === 0) {
						callback(null, []);
						return;
					}
					callback(null, ev.detail.response);
				}
			};

			langTools.addCompleter(rhymeCompleter);
		},

		jsHintConfigSrcLoaded: function(ev) {
			this.jsHintOptions = ev.detail.response;

			if (this.workerReady) {
				this.setJSHintOptions();
			}
		},

		// allow styling from the outside world!
		//applyAuthorStyles: true,
		registerCallback: function (polymerElt) {
			var selectors = [
				'#ace_editor',
				'#ace-tm'
			];
			var content = polymerElt.templateContent();
			for (var i = 0, l = selectors.length, s, n; (i < l) && (s = selectors[i]); i++) {
				n = document.querySelector(s);
				if (n) {
					content.appendChild(cloneStyle(n));
				}
			}
		},
		// TODO(sorvell): to work in IE reliably, can only be
		// created in enteredView. However, api that wants to access this.editor
		// may be used before that. Instead of making each function bail if
		// this.editor is not set, we create a dummy editor. At editor
		// initialization time, any pending changes are synch'd.
		ready: function () {
			var div = this.$.editor;//document.createElement('div');
			div.style.width = '500px';
			div.style.height = '500px';
			this.editor = ace.edit(div);
			this.enteredView();

			//this.appendChild(div);
		},
		enteredView: function () {
			this.initializeEditor();
		},
		initializeEditor: function () {
			var self = this;
			var editor = this.editor;
			//this._whenMatches(document.head, '#ace_editor', 'applyTheme');
			[].forEach.call(document.head.querySelectorAll('style'), function(style) {
				if(style.textContent.indexOf('ace') !== -1) {
					self.shadowRoot.appendChild(cloneStyle(style));
				}

			});
			this.themeChanged();
			ace.config.set('basePath', this.resolvePath('src-min-noconflict/'));
			ace.config.set("workerPath", this.resolvePath('src-min-noconflict/'));
			editor.setOption('enableSnippets', true);
			editor.setOption('enableBasicAutocompletion', true);
			editor.setOption('enableLiveAutocompletion', true);

			this.session = editor.getSession();

			editor.setTheme("ace/theme/monokai");

			editor.focus();
			this.readonlyChanged();
			this.wrapChanged();
			this.tabSizeChanged();
			this.modeChanged();
			editor.on("blur", this.editorBlurAction.bind(this));
			editor.on('change', this.editorChangeAction.bind(this));
			this.value = this.textContent;

			var usedKeybinding = 'sublime';

			editor.commands.addCommand({
				name: 'changeToACEKeybindings',
				bindKey: {win: 'Ctrl-Alt-A',  mac: 'Command-Alt-A', linux: 'Ctrl-Alt-A'},
				exec: function(editor) {
					editor.setKeyboardHandler("ace/keyboard/ace");
				}
			});

			editor.commands.addCommand({
				name: 'changeToVIMKeybindings',
				bindKey: {win: 'Ctrl-Alt-V',  mac: 'Command-Alt-V', linux: 'Ctrl-Alt-V'},
				exec: function(editor) {
					editor.setKeyboardHandler("ace/keyboard/vim");
				}
			});


		},
		fontSizeChanged: function () {
			this.$.editor.style.fontSize = this.fontSize;
		},
		modeChanged: function () {
			this.editor.getSession().setMode('ace/mode/' + this.mode);
		},
		themeChanged: function () {
			this.editor.setTheme('ace/theme/' + this.theme);

			this._whenMatches(document.head, '#ace-' + this.theme, 'applyTheme');
		},
		_whenMatches: function (node, selector, method) {
			var m = node.querySelector(selector);
			if (m) {
				if (this[method]) {
					this[method].call(this, m);
				}
			} else {
				var cb = this._whenMatches.bind(this, node, selector, method);
				this.onMutation(node, cb);
			}
		},
		applyTheme: function (style) {
			if (style) {
				this.shadowRoot.appendChild(cloneStyle(style));
			} else {

			}
		},
		valueChanged: function () {
			this.editorValue = this.value;
			this.editor.clearSelection();
			this.editor.resize();
			this.editor.focus();
		},
		readonlyChanged: function () {
			this.editor.setReadOnly(this.readonly);
			this.editor.setHighlightActiveLine(!this.readonly);
			this.editor.setHighlightGutterLine(!this.readonly);
			this.editor.renderer.$cursorLayer.element.style.opacity = this.readonly ? 0 : 1;
		},
		wrapChanged: function () {
			this.editor.getSession().setUseWrapMode(this.wrap);
		},
		tabSizeChanged: function () {
			if (this.tabSize) {
				this.editor.getSession().setTabSize(this.tabSize);
			}
		},
		foldTag: function (tag) {
			var s = this.editor.getSession();
			if (!s.foldWidgets) {
				return
			}
			var pos = this.find('<' + tag, {start: 0});
			// check if tag found
			if (!pos) {
				return;
			}
			var start = pos.start.row;
			// find the fold range
			var range = s.getFoldWidgetRange(start);
			// check if can be folded
			if (range) {
				var end = range.end.row;
				// fold
				s.foldAll(start, end);
			}
		},
		find: function () {
			return this.editor.find.apply(this.editor, arguments);
		},
		gotoLine: function () {
			this.editor.gotoLine.apply(this.editor, arguments);
			this.editor.getSession().selection.moveCursorLineStart();
			this.editor.clearSelection();
		},
		editorBlurAction: function (event) {
			if (this._value !== null && this._value != this.editorValue) {
				this.fire('editor-change', {value: this.editorValue, oldValue: this._value});
			}
			this._value = this.editorValue;
		},
		editorChangeAction: function () {
			this.fire('editor-input', {value: this.editorValue, oldValue: this._value});
		},
		get editorValue() {
			return this.editor.getValue();
		},
		set editorValue(value) {
			this._value = value;
			this.editor.setValue(value);
		},
		focus: function () {
			this.editor.focus();
		}
	});

	// IE safe style clone
	function cloneStyle(style) {
		var s = document.createElement('style');
		s.textContent = style.textContent;
		return s;
	}
})();