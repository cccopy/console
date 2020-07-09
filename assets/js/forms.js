
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
		var layout = $jqForm.attr("layout");
		var shouldWait = false;
		var submitFn = function(){
			if (formEl.reportValidity()) {
				$self.attr("status", "loading").prop("disabled", true);
				$jqForm.submit();
			}
		};
		if (!blockSubmit && formEl){
			if (layout == "tabs") {
				var inputs = formEl.elements;
				for (var i = 0, len = inputs.length; i < len; i++) {
					if (inputs[i].validity.valid === false) {
						var tabpane = inputs[i].closest("div.tab-pane");
						if (!$(tabpane).hasClass("active")){
							shouldWait = true;
							$("ul.nav-tabs a[href='#" + tabpane.id + "'").click();
						}
						break;
					}
				}
			}
			if (shouldWait) setTimeout(submitFn, 300);
			else submitFn();
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

	$("[layout=form] label[image-field] input[type=file]").on('change', imageFileHandler);
});
