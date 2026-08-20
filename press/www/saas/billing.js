// Supplements frappe core's native billing.bundle.js, which anchors its trial
// banner to `.icons-container` (the legacy desktop-icons home page) and never
// renders on a Workspace-based home page (`desktop:home_page = "workspace"`),
// since that element doesn't exist there. This script renders the same
// information into `.layout-main-section` instead, ONLY when the native
// mechanism can't (i.e. `.icons-container` is absent) — it fully defers to
// native everywhere else (including "Manage Billing", which isn't gated by
// `.icons-container` and already works once frappe.boot.is_fc_site is set).
(function () {
	function has_icons_container() {
		return $(".icons-container").length > 0;
	}

	function get_trial_end_days() {
		var site_info = frappe.boot.site_info;
		if (!site_info || !site_info.trial_end_date) return null;
		var trial_end_date = new Date(site_info.trial_end_date);
		var diff_ms = trial_end_date - new Date();
		return Math.ceil(diff_ms / (1000 * 60 * 60 * 24));
	}

	function dismiss_key() {
		return "sowaan_trial_banner_dismissed_on:" + frappe.boot.sitename;
	}

	function is_dismissed_today() {
		return localStorage.getItem(dismiss_key()) === new Date().toDateString();
	}

	function dismiss_for_today() {
		localStorage.setItem(dismiss_key(), new Date().toDateString());
	}

	function open_dashboard() {
		var base_url = (frappe.boot.site_info && frappe.boot.site_info.base_url) || "https://admin.sowaancloud.com";
		window.open(base_url + "/dashboard/sites/" + frappe.boot.sitename, "_blank");
	}

	function render_banner(days) {
		if ($(".sowaan-trial-banner").length) return;

		var days_label = days > 1 ? days + " " + __("days") : days + " " + __("day");
		var is_fc_user = frappe.boot.site_info && frappe.boot.site_info.is_fc_user;
		var message = is_fc_user
			? __("Please upgrade for uninterrupted services")
			: __("Please contact your system administrator to upgrade your plan");

		var $banner = $(
			'<div class="sowaan-trial-banner" style="' +
				"display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;" +
				"background:var(--alert-bg-info);color:var(--alert-text-info);" +
				"border:1px solid var(--border-color);border-radius:8px;" +
				'padding:10px 14px;margin:12px 0;font-size:13px;">' +
				"<span><b>" +
				__("Your trial ends in {0}.", [days_label]) +
				"</b> " +
				message +
				"</span>" +
				'<span style="white-space:nowrap;">' +
				(is_fc_user
					? '<button type="button" class="btn btn-sm btn-primary sowaan-trial-upgrade" style="margin-right:8px;">' +
						__("Upgrade plan") +
						"</button>"
					: "") +
				'<button type="button" class="btn btn-sm btn-secondary sowaan-trial-dismiss">' +
				__("Dismiss") +
				"</button>" +
				"</span>" +
				"</div>",
		);

		$banner.find(".sowaan-trial-upgrade").on("click", open_dashboard);
		$banner.find(".sowaan-trial-dismiss").on("click", function () {
			dismiss_for_today();
			$banner.remove();
		});

		$(".layout-main-section").first().before($banner);
	}

	function maybe_render() {
		if (has_icons_container()) return; // native billing.bundle.js already handles this case
		if ($(".sowaan-trial-banner").length) return;
		if (!$(".layout-main-section").length) return;

		var days = get_trial_end_days();
		if (days === null || days <= 0) return;

		render_banner(days);
	}

	$(document).ready(function () {
		if (!frappe.boot.is_fc_site) return;
		if (!frappe.boot.setup_complete || frappe.is_mobile()) return;
		if (!frappe.user.has_role("System Manager")) return;
		if (is_dismissed_today()) return;

		// Desk boot is async and .layout-main-section only exists once a page
		// has actually rendered, so check now and on every subsequent route
		// change rather than assuming it's already in the DOM.
		maybe_render();
		frappe.router.on("change", maybe_render);
	});
})();
