

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