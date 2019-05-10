

// Select2
$(function() {
	$('.select2-tags').each(function() {
		$(this).wrap('<div class="position-relative"></div>')
			.select2({
				placeholder: '請點選',
				dropdownParent: $(this).parent()
			});
	})
});