

// Select2
$(function() {
	$('.select2-tags').each(function() {
		var self = $(this);
		self.wrap('<div class="position-relative"></div>')
			.select2({
				tags: self.attr("autoCreate") != undefined,
				placeholder: '請點選',
				dropdownParent: self.parent()
			})
			.on("select2:select", function(evt){
				var element = evt.params.data.element;
				var $element = $(element);

				$element.detach();
				$(this).append($element);
				$(this).trigger("change");
			});
	});
});

// editlist add/remove
$(function(){

	function loadFile(input, img, hidden){
		var reader = new FileReader();
		reader.onload = function(){
			img.src = reader.result;
			hidden.value = reader.result;
		};
		reader.readAsDataURL(input.files[0]);
	}

	function rearrangeIndex(table){
		var startIdx = table._newEntryStartIdx;
		var namePrefix = table._namePrefix;
		var re = new RegExp("^([\\S]+)(\\[(.*)\\])$");
		table._newers.forEach(function(trel, idx){
			$(trel).find("[name]").each(function(nidx, nel){
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

	// initailize fields in editlist
	function initListField(trEl){
		// used if update page
		$(trEl).find('a[editlist-remove-btn]').click(function(){
			var $curTrEl = $(this).closest("tr"),
				curTrEl = $curTrEl.get(0),
				table = $curTrEl.closest("table").get(0),
				tridx;

			if ( ( tridx = table._newers.indexOf($curTrEl.get(0)) ) != -1) {
				table._newers.splice(tridx, 1);
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
				loadFile(self, img, hidden);
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

		table._newers.push(trEl.get(0));

		initListField(trEl);
		// rearrange index
		rearrangeIndex(table);
	});

	$('table[editlist-table]').each(function(tidx, tel){
		var trs = $(tel).find("tbody > tr");
		tel._newEntryStartIdx = trs.length;
		tel._namePrefix = $(tel).attr("editlist-prefix");
		tel._newers = [];
		trs.each(function(cidx, cel){ initListField(cel); });
	});
});
