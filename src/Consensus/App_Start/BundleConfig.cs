using System;
using System.Web.Optimization;

namespace Consensus
{
	public class BundleConfig
	{
		public static void RegisterBundles(BundleCollection bundles)
		{
			var appJs = new ScriptBundle("~/js/app").Include(
					"~/scripts/jquery-{version}.js",
					"~/scripts/bootstrap.js",
					"~/scripts/angular.js",
					"~/scripts/angular-cookies.js",
					"~/scripts/ui-bootstrap-tpls-{version}.js",
					"~/scripts/jquery.signalR-{version}.js",
					"~/scripts/consensus.pokerRoom.js");

			appJs.Transforms.Clear();
			bundles.Add(appJs);

			var appCss = new StyleBundle("~/css/app").Include(
					"~/content/bootstrap.css",
					"~/content/consensus.css");

			bundles.Add(appCss);
		}
	}
}