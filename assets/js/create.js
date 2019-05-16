

// container save
$(function(){
	// test
	$("[name=scenario]").get(0)._value = [2,3,4,{ a: 5 }]

	$("button[container-save]").click(function(){
		$self = $(this);
		$self.attr("status", "loading").prop("disabled", true);

		// collect items
		var data = {};
		$root = $self.parents(".layout-content");
		$root.find("[name]").each(function(idx, el){
			var $el = $(el);
			if ( $el.attr("valueprop") ) {
				data[el.name] = el[$el.attr("valueprop")]
			} else {
				data[el.name] = $(el).val();	
			}
		});

		Promise.resolve($[$self.attr('method')](window.location.pathname, data))
			.then(function(res){
				console.log(res);
			});
	});
});
