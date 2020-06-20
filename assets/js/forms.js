
// Select2
$(function() {
	var blockSubmit = false;
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
		if (!blockSubmit && formEl && formEl.reportValidity()) {
			$self.attr("status", "loading").prop("disabled", true);
			$jqForm.submit();
		}
	});

	$("input[unique]").blur(function(){
		var $self = $(this);
		var $jqForm = $self.closest("form");
		var inputEl = $self.get(0);
		var value = $self.val();
		$self.removeClass("is-valid is-invalid");
		blockSubmit = true;
		$.get({
			url: ["uniquecheck", $self.attr("name"), value].join("/")
		})
		.done(function(res){
			blockSubmit = false;
			if (res == "fail") {
				$self.addClass("is-invalid");
				inputEl.setCustomValidity(value + " is already in use.");
			} else if (res == "ok") {
				$self.addClass("is-valid");
				inputEl.setCustomValidity("");
			}
		});
	});
});
