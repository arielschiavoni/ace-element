(function (style) {
	Polymer('ace-element', {
		mode: 'javascript',
		theme: 'monokai',
		readonly: false,
		value: null,
		wrap: false,
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
			var div = document.createElement('div');
			div.style.width = '500px';
			div.style.height = '500px';
			this.editor = ace.edit(div);
			this.enteredView();
			this.appendChild(div);

			//this.$.editor.appendChild(div);
		},
		enteredView: function () {
			this.initializeEditor();
		},
		initializeEditor: function () {
			ace.config.set('basePath', this.resolvePath('src-noconflict/'));
			//this.editor = ace.edit(document.createElement('div'));
			//this.editor = ace.edit(this.$.editor);
			this.editor.getSession().setMode("ace/mode/javascript");
			//this.editor.getSession().setMode("mode/javascript");
			this.editor.setTheme("ace/theme/monokai");
			//this.$.editor.appendChild(this.div);
			this.editor.focus();
			this.readonlyChanged();
			this.wrapChanged();
			this.tabSizeChanged();
			this.editor.on("blur", this.editorBlurAction.bind(this));
			this.editor.on('change', this.editorChangeAction.bind(this));
			this.value = this.textContent;
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
			}
		},
		valueChanged: function () {
			this.editorValue = this.value;
			this.editor.clearSelection();
			this.editor.resize();
			//this.editor.focus();
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