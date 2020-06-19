
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

	$("button[container-save]").click(function(){
		var $self = $(this);
		var $jqForm = $self.closest("form");
		var formEl = $jqForm.length ? $jqForm.get(0) : null;
		if (formEl && formEl.reportValidity()) {
			$self.attr("status", "loading").prop("disabled", true);
			$jqForm.submit();
		}
	});
});
