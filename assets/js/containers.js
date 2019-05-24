
function loadFile(file, img, hidden){
	var reader = new FileReader();
	reader.onload = function(){
		img.src = reader.result;
		if (hidden) hidden.value = reader.result;
	};
	reader.readAsDataURL(file);
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

		$(trEl).find("label[image-field] input[type=file]").on('change', function(){
			var self = this;
			var img = $(self).siblings("img").get(0);
			var hidden = $(self).siblings("input[type=hidden]").get(0);
			if (self.files && self.files[0]) {
				loadFile(self.files[0], img, hidden);
				self._filename = self.files[0].name;
			}
		});

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

		$self.find("[map-tpl='string'] button").click(function(){
			var textSource = $(this).siblings("input");
			if (textSource.val()){
				var tplInnerContent = $self.siblings("template[type='string']").get(0).content,
					url = textSource.val();

				var newAnchor = addNewAnchor(tplInnerContent);

				newAnchor.find('[string-url]').val(url);

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
});


$(function(){
	$(".gridview").dataTable();
});

