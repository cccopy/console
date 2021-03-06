
function loadFile(file, img){
	var reader = new FileReader();
	reader.onload = function(){
		img.src = reader.result;
	};
	reader.readAsDataURL(file);
}

function imageFileHandler(){
	var self = this;
	var img = $(self).siblings("img").get(0);
	if (self.files && self.files[0]) {
		loadFile(self.files[0], img);
		self._filename = self.files[0].name;
	}
}

function rearrangeIndex(container){
	var startIdx = container._startIdx || 0;
	var namePrefix = container._namePrefix;
	var re = new RegExp("^([\\S]+)(\\[(.*)\\])$");
	container._groups.forEach(function(unitel, idx){
		$(unitel).find("[name]").each(function(nidx, nel){
			var resultIdx = idx + startIdx, matches,
				wrapName = ["[", "]"].join(nel._originName);
			if ( matches = nel._originName.match(re) ) {
				wrapName = ["[", "]"].join(matches[1]) + matches[2];
			}
			$(nel).attr("name", namePrefix + "[" + resultIdx + "]" + wrapName);
			if ( nel._originName == '_idx' ) {
				$(nel).val(resultIdx);
			}
		});
	});
}

function getYoutubeThumbnail(url){
	var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\?v=)([^#\&\?]*).*/;
	var match = url.match(regExp);
    if (match && match[2].length == 11) {
    	return "https://img.youtube.com/vi/" + match[2] + "/0.jpg";
    }
    return "";
}

// editlist add/remove
$(function(){

	// initailize fields in editlist
	function initListField(trEl){
		// used if update page
		$(trEl).find('a[editlist-remove-btn]').click(function(){
			var $curTrEl = $(this).closest("tr"),
				curTrEl = $curTrEl.get(0),
				table = $curTrEl.closest("table").get(0),
				tridx;

			if ( ( tridx = table._groups.indexOf($curTrEl.get(0)) ) != -1) {
				table._groups.splice(tridx, 1);
				// rearrange index
				rearrangeIndex(table);
			}
			$curTrEl.remove();
		});

		$(trEl).find("label[image-field] input[type=file]").on('change', imageFileHandler);

		$(trEl).find("[name]").each(function(nidx, nel){
			nel._originName = $(nel).attr("name");
		});
	}

	// editlist-add-btn
	$('button[editlist-add-btn]').click(function(){
		var $selfBtn = $(this),
			table = $selfBtn.siblings("div").find("table").get(0),
			addTarget = $(table).children("tbody"),
			templateContent = $selfBtn.siblings("template").get(0).content;
		addTarget.append( document.importNode(templateContent, true) );

		var trEl = addTarget.children().last();

		table._groups.push(trEl.get(0));

		initListField(trEl);
		// rearrange index
		rearrangeIndex(table);
	});

	$('table[editlist-table]').each(function(tidx, tel){
		var trs = $(tel).find("tbody > tr");
		tel._startIdx = trs.length;
		tel._namePrefix = $(tel).attr("editlist-prefix");
		tel._groups = [];
		trs.each(function(cidx, cel){ initListField(cel); });
	});
});

// media sort list
$(function(){

	$('[mediasortlist-inputs]').each(function(midx, mel){
		var $self = $(this),
			addTarget = $self.siblings(".row"),
			tplMainContent = $self.siblings("template[type='main-wrap']").get(0).content;

		mel._namePrefix = $self.attr("mediasortlist-prefix");
		mel._groups = [];

		var drake = dragula([addTarget.get(0)], {
			moves: function(el, container, handle) {
				return handle.classList.contains('sort-item-move');
			},
			direction: 'mixed'
		});

		drake.on("drop", function(){ 
			// force rearrange group
			mel._groups = [];
			addTarget.children().each(function(){
				mel._groups.push(this);
			});
			rearrangeIndex(mel);
		});

		// init remove event
		addTarget.children().each(wrapBind);
		
		rearrangeIndex(mel);

		function wrapBind(){
			mel._groups.push(this);
			// remove event
			$(this).children("button").click(function(){
				var $curMediaEl = $(this).closest(".media"),
					curMediaEl = $curMediaEl.get(0),
					mediaIdx;

				if ( ( mediaIdx = mel._groups.indexOf(curMediaEl) ) != -1) {
					mel._groups.splice(mediaIdx, 1);
					rearrangeIndex(mel);
				}
				$curMediaEl.remove();
			});

			$(this).find("[name]").each(function(nidx, nel){
				nel._originName = $(nel).attr("name");
			});
		}

		function addNewAnchor(inner){
			addTarget.append( document.importNode(tplMainContent, true) );

			var $newEl = addTarget.children().last(),
				newAnchor = $newEl.find('a'),
				newEl = $newEl.get(0);

			newAnchor.append( document.importNode(inner, true) );

			wrapBind.call(newEl);

			rearrangeIndex(mel);

			return newAnchor;
		}

		$self.find("[map-tpl='image-file'] input[type=file]").on('change', function(){
			if (this.files) {
				var tplInnerContent = $self.siblings("template[type='image-file']").get(0).content,
					f = 0, fileLen = this.files.length;

				for( ; f < fileLen; f++ ){
					var file = this.files[f];

					var newAnchor = addNewAnchor(tplInnerContent);

					loadFile(file, newAnchor.find('img').get(0));

					newAnchor.find('[image-file-name]').val(file.name);
				}
			}
		});

		$self.find("[map-tpl='video-url'] button").click(function(){
			var textSource = $(this).siblings("input");
			if (textSource.val()){
				var tplInnerContent = $self.siblings("template[type='video-url']").get(0).content,
					url = textSource.val();

				var newAnchor = addNewAnchor(tplInnerContent);

				newAnchor.find('[video-url-string]').val(url);

				var thumbnailUrl = getYoutubeThumbnail(url);
				if (thumbnailUrl) {
					newAnchor.find('img').attr('src', thumbnailUrl);
				} else {
					// ...
				}
				textSource.val("");	// reset
			}
		});
	});

	$('[fieldsortlist-inputs]').each(function(midx, mel){
		var $self = $(this),
			addTarget = $self.siblings(".row"),
			tplMainContent = $self.siblings("template[type='main-wrap']").get(0).content,
			addButton = $self.children("button");

		mel._namePrefix = $self.attr("fieldsortlist-prefix");
		mel._groups = [];

		var drake = dragula([addTarget.get(0)], {
			moves: function(el, container, handle) {
				return handle.classList.contains('sort-item-move');
			},
			direction: 'mixed'
		});

		drake.on("drop", function(){ 
			// force rearrange group
			mel._groups = [];
			addTarget.children().each(function(){
				mel._groups.push(this);
			});
			rearrangeIndex(mel);
		});

		// init remove event
		addTarget.children().each(wrapBind);
		
		rearrangeIndex(mel);

		function wrapBind(){
			mel._groups.push(this);
			// remove event
			$(this).children("button").click(function(){
				var $curMediaEl = $(this).closest(".media"),
					curMediaEl = $curMediaEl.get(0),
					mediaIdx;

				if ( ( mediaIdx = mel._groups.indexOf(curMediaEl) ) != -1) {
					mel._groups.splice(mediaIdx, 1);
					rearrangeIndex(mel);
				}
				$curMediaEl.remove();
			});

			$(this).find("[name]").each(function(nidx, nel){
				nel._originName = $(nel).attr("name");
			});
		}

		addButton.click(function(){

			addTarget.append( document.importNode(tplMainContent, true) );

			var $newEl = addTarget.children().last(),
				newAnchor = $newEl.find('.media-body'),
				newEl = $newEl.get(0);

			$self.find("input,select").each(function(){
				var $inputSelf = $(this);

				var mapName = $inputSelf.parent().attr("map-name");

				var tplInner = $self.siblings("template[type='" + mapName + "']").get(0),
					tplInnerShowFormat = $(tplInner).attr("show-format"),
					tplInnerContent = tplInner.content;

				newAnchor.append( document.importNode(tplInnerContent, true) )

				var tagname = $inputSelf[0].tagName.toLowerCase();
				if ( tagname == "input" ) {
					var val = $inputSelf.val();
					if (tplInnerShowFormat) val = tplInnerShowFormat.replace("%v", val);
					newAnchor.find('[text-label]').last().text(val);
				} else if ( tagname == "select" ) {
					var val = $inputSelf.find(":selected").text();
					if (tplInnerShowFormat) val = tplInnerShowFormat.replace("%v", val);
					newAnchor.find('[text-label]').last().text(val);
				}
				newAnchor.find('[text-content]').last().val($inputSelf.val());

				$inputSelf.val("");
			});

			wrapBind.call(newEl);

			rearrangeIndex(mel);
		});
	});
});

// gridview
$(function(){
	var views = $(".gridview");
	views.each(function(){
		var $self = $(this),
			infoEl = $self.find(".action-infos"),
			infos = infoEl.length ? JSON.parse(infoEl.text()) : [],
			dt;

		var checkSelector = 'tr > td:first-child input[type=checkbox]';

		infoEl.remove();

		var dtOptions = {
			order: [],
			pageLength: 25
		}

		if (infos.length) {
			Object.assign(dtOptions, {
				columnDefs: [{
					targets: 'no-sort',
					orderable: false
				}],
				drawCallback: function(settings){
					// console.log(this);
					if (!dt) return;
					var container = dt.api().table().container();
					var toolwrap = $(container).children(".row:first-child");
					var actionWrap = toolwrap.find(".form-inline");
					if ( actionWrap.length ) {
						if ($(this).find(checkSelector + ":checked").length == 0) actionWrap.hide();
						else actionWrap.show();
					}
				}
			});
		}
		
		dt = $self.dataTable(dtOptions);

		if (infos.length){
			var container = dt.api().table().container();
			var toolwrap = $(container).children(".row:first-child");
			
			var options = infos.map(function(info, idx){
				return '<option value="' + idx + '">' + info.label + '</option>';
			}).join('');
			options = '<option>Choose...</option>' + options;

			toolwrap.append('<div class="col-sm-12 col-md-6">'
				+ '<div class="form-inline mb-sm-2" style="display:none;">'
					+ '<label>Action</label>'
					+ '<select class="custom-select custom-select-sm ml-2 mr-2">' + options + '</select>'
					+ '<button type="button" class="btn btn-sm btn-default">Go</button>'
				+ '</div>' 
			+ '</div>'
			);

			var actionWrap = toolwrap.find(".form-inline");
			
			$self.on('change', checkSelector, function(){
				if (this.checked) {
					actionWrap.show();
				} else if ($(this.closest("tbody")).find(checkSelector + ":checked").length == 0){
					actionWrap.hide();
				}
			});

			var buttonWrap = actionWrap.find("button");
			var selectWrap = actionWrap.find("select");

			buttonWrap.click(function(){
				var theSelectIdx = parseInt(selectWrap.val());
				var checkeds = $(container).find(checkSelector + ":checked");
				if (!isNaN(theSelectIdx) && checkeds.length){
					buttonWrap.prop("disabled", true);
					
					var promises = [],
						info = infos[theSelectIdx];
					
					checkeds.each(function(){
						var ajaxObj = {
							method: info.method,
							url: info.url.replace(":id", this.value)
						};

						if (info.field && typeof info.value !== "undefined") {
							var data = {};
							data[info.field] = info.value;
							ajaxObj.data = data;
						}
						// console.log(ajaxObj);
						promises.push($.ajax(ajaxObj));
					});

					Promise.all(promises)
						.then(function(){
							location.reload(true);
						});
				}
			});
		}

	});
});

// gallery view
$(function(){

	var $thumbnails = $('#gallery-thumbnails');

	$thumbnails.on('click', '.gallery-thumbnail i[action-url]', function(e){
		e.preventDefault();
		e.stopPropagation();
		var $self = $(this);
		// console.log("icon click");

		var $wrap = $self.closest(".gallery-thumbnail");
		var id = $wrap.data("id");
		var url = $self.attr("action-url");
		var method = $self.attr("action-method");

		url = url.replace(":id", id);

		var isAjax = url.split("/ajax/").length > 1;
		if (isAjax) {
			var ajaxObj = {
				method: method,
				url: url
			};

			Promise.resolve($.ajax(ajaxObj))
				.then(function(){
					location.reload(true);
				});
		} else {
			window.location.href = url;
		}
	});

	$thumbnails.on('click', '.gallery-thumbnail > .img-thumbnail', function(e) {
		e.preventDefault();
		
		// Select only visible thumbnails
		var links = $thumbnails.find('.gallery-thumbnail:not(.d-none) > .img-thumbnail');

		window.blueimpGallery(links, {
			container: '#gallery-lightbox',
			carousel: true,
			hidePageScrollbars: true,
			disableScroll: true,
			index: this
		});
	});

	if (window.Masonry) {
		var msnry = new Masonry('#gallery-thumbnails', {
			itemSelector: '.gallery-thumbnail:not(.d-none)',
			columnWidth: '.gallery-sizer',
			originLeft: !($('body').attr('dir') === 'rtl' || $('html').attr('dir') === 'rtl')
		});

		$('#gallery-filter').on('click', '.nav-link', function(e) {
			e.preventDefault();

			// Set active filter
			$('#gallery-filter .nav-link').removeClass('active');
			$(this).addClass('active');

			// Show all
			if (this.getAttribute('href') === '#all') {
				$thumbnails.find('.gallery-thumbnail').removeClass('d-none');

			// Show thumbnails only with selected tag
			} else {
				$thumbnails.find('.gallery-thumbnail:not([data-tag="' + this.getAttribute('href').replace('#', '') + '"])').addClass('d-none');
				$thumbnails.find('.gallery-thumbnail[data-tag="' + this.getAttribute('href').replace('#', '') + '"]').removeClass('d-none');
			}

			// Relayout
			msnry.layout();
		});
	}
	
});
