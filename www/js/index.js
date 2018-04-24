var app = {
    init: function() {
        if(localStorage.getItem("server")) {
            app.setup_login();
        } else {
			app.show_server();
        }
        app.bind_events();
		common.handle_external_links();
    },
    bind_events: function() {
		app.bind_select_server();
		app.bind_login();
		app.bind_change_server();
    },
	bind_login: function() {
		$(".btn-login").on("click", function() {

			$me = $(this);
			$me.prop("disabled", true);
			$.ajax({
				method: "POST",
				url: localStorage.server + "/api/method/login",
				data: {
					usr: $("#usr").val(),
					pwd: $("#pwd").val(),
					device: "mobile"
				}
			}).success(function(data, status, xhr) {
				localStorage.user = $("#usr").val();
				var cookie_source = xhr.getResponseHeader('Set-Cookie');
				localStorage.session_id = common.get_cookie("sid", cookie_source);
				app.start_desk();
			}).error(function() {
				common.msgprint("Invalid Login");
				$me.prop("disabled", false);
			}).always(function() {
				// $("#usr").val("");
				// $("#pwd").val("");
			});
			return false;
		});
	},
	bind_select_server: function() {
        $(".btn-select-server").on("click", function() {
            // check if erpnext / frappe server

            $(this).prop("disabled", true);

            var server = $("#server").val();
            if(!server) {
                app.retry_server();
                return false;
            }


            if(server.substr(0, 7)!== "http://" && server.substr(0, 8)!== "https://") {
                // http / https not provided
                // try https
                app.verify_server("https://" + server, select,
                    function() {
                        // try http
                        app.verify_server("http://" + server, select, app.retry_server);
                    }
                );
            } else {
                app.verify_server(server, select, app.retry_server);
            }

            return false;
        });
		$(".recent-server-list").on("click", "a", function() {
			$this = $(this);
			$this.prop("disabled", true);
			app.verify_server($this.text(), select, app.retry_server);
		});

		function select(server) {
			localStorage.server = app.strip_trailing_slash(server);
			app.save_server_in_recent(localStorage.server);
			app.setup_login();
		}
	},
    verify_server: function(server, valid, invalid) {
        $.ajax({
    			method: "GET",
    			url: server + "/api/method/version",
    		})
            .success(function(data) {
                if(data.message) {
                    valid(server);
                } else {
                    invalid();
                };
            })
            .fail(function() { invalid() })
            .error(function() { invalid() });
    },
	bind_change_server: function() {
		$(".change-server").on("click", function() {
			localStorage.server = "";
			app.show_server(true);
			return false;
		});
	},
    strip_trailing_slash: function(server) {
        return server.replace(/(http[s]?:\/\/[^\/]*)(.*)/, "$1");
    },
	save_server_in_recent: function(server) {
		server = server.toLowerCase().trim();

		var recent_servers = localStorage.recent_servers ?
			JSON.parse(localStorage.recent_servers) : [];

		var index = recent_servers.indexOf(server);
		if(index !== -1) {
			recent_servers.splice(index, 1);
		}
		recent_servers.push(server);

		localStorage.setItem("recent_servers", JSON.stringify(recent_servers));
	},
    setup_login: function() {
		if(localStorage.server && localStorage.session_id) {
			app.if_session_valid(app.start_desk, app.show_login);
		} else {
			app.show_login();
		}
    },
	show_login: function() {
		$(".app").removeClass("hide");
        $(".div-select-server").addClass("hide");
        $(".div-login").removeClass("hide");
		$(".current-server").text(localStorage.server);
	},
	if_session_valid: function(if_yes, if_no) {
		app.set_sid_cookie();
		$.ajax({
			method: "GET",
			crossDomain: true,
			url: localStorage.server + "/api/method/ping",
		}).success(function(data) {
			if(data.message === "pong") {
				if_yes();
			} else {
				if_no();
			}
		}).error(function() {
			if_no();
		});
	},
	set_sid_cookie: function() {
		document.cookie = "sid=" + localStorage.session_id +
			"; expires=Fri, 31 Dec 9999 23:59:59 GMT";
	},
	start_desk: function() {
		window.location.href = "desk.html";
	},
    retry_server: function() {
        common.msgprint("Does not seem like a valid server address. Please try again.");
		app.show_server();
    },
	show_server: function(clear) {
		$(".app").removeClass("hide");
        $(".btn-select-server").prop("disabled", false);
        $(".div-select-server").removeClass("hide");
        if(clear) {
            $(".div-login").addClass("hide");
        }
		app.show_recent_servers();
	},
	show_recent_servers: function() {
		if(localStorage.recent_servers) {
			var recent_servers = JSON.parse(localStorage.recent_servers);
			recent_servers.reverse().splice(2);

			var html = "<li class='text-muted'>Recent:</li>"
			$.each(recent_servers, function(i, server) {
				html += '<li><a>'+server+'</a></li>';
			});
			$('.recent-server-list').empty().append(html).removeClass('hide');
		}
	}
};

document.addEventListener('deviceready', app.init, false);
