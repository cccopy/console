

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

	function loadFile(input, output){
		var reader = new FileReader();
		reader.onload = function(){
			output.src = reader.result;
		};
		reader.readAsDataURL(input.files[0]);
	}

	// initailize fields in editlist
	function initListField(trEl){
		// used if update page
		$(trEl).find('a[editlist-remove-btn]').click(function(){
			$(this).parents("tr").remove();
		});

		$(trEl).find("label[image-field] input[type=file]").on('change', function(){
			var self = this;
			var img = $(self).siblings("img").get(0);
			if (self.files && self.files[0]) {
				loadFile(self, img);
			}
		});
	}

	// editlist-add-btn
	$('button[editlist-add-btn]').click(function(){
		var $selfBtn = $(this),
			addTarget = $selfBtn.siblings("div").find("table tbody"),
			templateContent = $selfBtn.siblings("template").get(0).content;
		addTarget.append( document.importNode(templateContent, true) );
		initListField(addTarget.children().last());
	});

	$('table[editlist-table] tbody tr').each(function(idx, el){
		initListField(el);
	});

});
