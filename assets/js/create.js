

// container save
$(function(){
	$("button[container-save]").click(function(){
		$self = $(this);
		$self.attr("status", "loading").prop("disabled", true);
		$root = $self.closest(".layout-content");
		$root.find("[name][valuefor]").each(function(idx, el){
			var $el = $(el);
			var valuefor = $el.attr("valuefor");
			// siblings-img-src
			var props = valuefor.split('-');
			$el.val($el[props[0]](props[1]).attr(props[2]));
		});
		$self.closest("form").submit();
	});
});
