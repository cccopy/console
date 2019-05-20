

// container save
$(function(){

	function findvalue(target, valuefor){
		// sibings(input[type=file]).files.0.name
		var parts = valuefor.split('.');
		var final = target;
		var re = new RegExp("^([a-zA-Z]+)\\((.*)\\)$");
		parts.forEach(function(prop){
			var matches;
			if ( matches = prop.match(re) ) {
				var method = matches[1];
				var param = matches[2];
				if ( !(final instanceof jQuery) ) final = $(final); // try jqueryize
				if ( param == "" ) final = final[method]();
				else final = final[method](param);
			} else {
				if ( final instanceof jQuery) final = final.get(0);
				final = final[prop];
			}
		});
		return final;
	}

	$("button[container-save]").click(function(){
		$self = $(this);
		$self.attr("status", "loading").prop("disabled", true);
		$self.closest("form").submit();
	});

	$("form[container-form]").submit(function(){
		$self = $(this);
		$self.find("[name][valuefor]").each(function(idx, el){
			var $el = $(el);
			$el.val(findvalue($el, $el.attr("valuefor")));
		});
	});
});
