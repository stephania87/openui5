/* global QUnit */

QUnit.config.autostart = false;

sap.ui.require([
	"sap/ui/fl/Utils",
	"sap/ui/layout/VerticalLayout",
	"sap/ui/dt/DesignTime",
	"sap/ui/rta/command/CommandFactory",
	"sap/ui/rta/command/ControlVariantSwitch",
	"sap/ui/dt/OverlayRegistry",
	"sap/ui/dt/ElementOverlay",
	"sap/ui/fl/registry/ChangeRegistry",
	"sap/ui/layout/form/FormContainer",
	"sap/ui/layout/form/Form",
	"sap/ui/layout/form/FormLayout",
	"sap/ui/rta/plugin/ControlVariant",
	"sap/ui/core/Title",
	"sap/m/Button",
	"sap/uxap/ObjectPageLayout",
	"sap/uxap/ObjectPageSection",
	"sap/uxap/ObjectPageSubSection",
	"sap/m/Page",
	"sap/ui/fl/variants/VariantManagement",
	"sap/ui/fl/variants/VariantModel",
	"sap/ui/fl/changeHandler/BaseTreeModifier",
	// should be last
	'sap/ui/thirdparty/sinon',
	'sap/ui/thirdparty/sinon-ie',
	'sap/ui/thirdparty/sinon-qunit'
], 	function(
	Utils,
	VerticalLayout,
	DesignTime,
	CommandFactory,
	ControlVariantSwitch,
	OverlayRegistry,
	ElementOverlay,
	ChangeRegistry,
	FormContainer,
	Form,
	FormLayout,
	ControlVariantPlugin,
	Title,
	Button,
	ObjectPageLayout,
	ObjectPageSection,
	ObjectPageSubSection,
	Page,
	VariantManagement,
	VariantModel,
	BaseTreeModifier,
	sinon
) {
		"use strict";

		QUnit.start();

		var sandbox = sinon.sandbox.create();

		var fnGetMockedAppComponent = function(oModel) {
			return {
				getLocalId: function () {
					return undefined;
				},
				getManifestEntry: function () {
					return {};
				},
				getMetadata: function () {
					return {
						getName: function () {
							return "someName";
						}
					};
				},
				getManifest: function () {
					return {
						"sap.app" : {
							applicationVersion : {
								version : "1.2.3"
							}
						}
					};
				},
				getModel: function () { return oModel; }
			};
		};

		QUnit.module("Given a designTime and ControlVariant plugin are instantiated", {
			beforeEach: function (assert) {
				var done = assert.async();

				//	page
				//		verticalLayout
				//		objectPageLayout
				//			variantManagement (headerContent)
				//			objectPageSection (sections)
				//				objectPageSubSection
				//					verticalLayout
				//						button

				var oChangeRegistry = ChangeRegistry.getInstance();
				oChangeRegistry.registerControlsForChanges({
					"sap.ui.layout.VerticalLayout" : {
						"moveControls": "default"
					}
				});

				this.sLocalVariantManagementId = "component0--varMgtKeyStubbed";
				this.oButton = new Button();

				this.oLayout = new VerticalLayout("verlay1",{
					content : [this.oButton]
				});

				this.oObjectPageSubSection = new ObjectPageSubSection("objSubSection", {
					blocks: [this.oLayout]
				});

				this.oObjectPageSection = new ObjectPageSection("objSection",{
					subSections: [this.oObjectPageSubSection]
				});

				this.oVariantManagementControl = new VariantManagement("varMgtKey");

				this.oObjectPageLayout = new ObjectPageLayout("objPage",{
					headerContent: [this.oVariantManagementControl],
					sections : [this.oObjectPageSection]
				});

				this.oVariantManagementControl.setAssociation("for", "objPage", true);

				//this.oObjectPageLayout.setVariantManagement("varMgtKey");

				this.oLayoutOuter = new VerticalLayout("verlayouter", {
					content: [this.oObjectPageLayout]
				});

				this.oPage = new Page("mainPage", {
					content: [this.oLayoutOuter, this.oObjectPageLayout]
				}).placeAt("content");

				var oVariantManagementDesignTimeMetadata = {
					"sap.ui.fl.variants.VariantManagement": {
						actions : {
							"switch" : {
								changeType : "controlVariantSwitch"
							}
						}
					}
				};

				this.oDesignTime = new DesignTime({
					designTimeMetadata : oVariantManagementDesignTimeMetadata,
					rootElements : [this.oPage]
				});

				this.oDesignTime.attachEventOnce("synced", function() {
					this.oObjectPageLayoutOverlay = OverlayRegistry.getOverlay(this.oObjectPageLayout);
					this.oObjectPageSectionOverlay = OverlayRegistry.getOverlay(this.oObjectPageSection);
					this.oObjectPageSubSectionOverlay = OverlayRegistry.getOverlay(this.oObjectPageSubSection);
					this.oLayoutOuterOverlay = OverlayRegistry.getOverlay(this.oLayoutOuter);
					this.oButtonOverlay = OverlayRegistry.getOverlay(this.oButton);
					this.oVariantManagementOverlay = OverlayRegistry.getOverlay(this.oVariantManagementControl);
					this.oControlVariantPlugin = new ControlVariantPlugin({ commandFactory: CommandFactory });
					done();
				}.bind(this));

				sap.ui.getCore().applyChanges();
			},
			afterEach: function (assert) {
				sandbox.restore();
				this.oLayout.destroy();
				this.oPage.destroy();
				this.oDesignTime.destroy();
			}
		});

		QUnit.test("when registerElementOverlay is called", function(assert) {
			assert.ok(ElementOverlay.prototype.getVariantManagement, "then getVariantManagement added to the  ElementOverlay prototype");
			assert.ok(ElementOverlay.prototype.setVariantManagement, "then setVariantManagement added to the ElementOverlay prototype");
		});

		QUnit.test("when _isEditable is called with VariantManagement overlay", function(assert) {
			var bEditable = this.oControlVariantPlugin._isEditable(this.oVariantManagementOverlay);
			assert.ok(bEditable, "then VariantManagement overlay is editable");
		});

		QUnit.test("when registerElementOverlay is called with VariantManagement control Overlay", function(assert) {
			this.oControlVariantPlugin.registerElementOverlay(this.oVariantManagementOverlay);
			assert.strictEqual(this.oObjectPageLayoutOverlay.getVariantManagement(), "varMgtKey", "then Variant Management Key successfully set to ObjectPageLayout Overlay from the id of VariantManagement control");
			assert.notOk(this.oLayoutOuterOverlay.getVariantManagement(), "then no VariantManagement Key set to an element outside element not a part of the associated control");
			assert.deepEqual(this.oVariantManagementOverlay.getEditableByPlugins(), [this.oControlVariantPlugin.getMetadata().getName()],
				"then VariantManagement is marked as editable by ControlVariant plugin");
		});

		QUnit.test("when registerElementOverlay is called with VariantManagement control Overlay with componentid prefix", function(assert) {
			sandbox.stub(BaseTreeModifier, "getSelector").returns({id: this.sLocalVariantManagementId});
			this.oControlVariantPlugin.registerElementOverlay(this.oVariantManagementOverlay);

			assert.strictEqual(this.oObjectPageSectionOverlay.getVariantManagement(), this.sLocalVariantManagementId, "then Variant Management Key successfully set to ObjectPageSection (first child) Overlay");
			assert.strictEqual(this.oObjectPageSubSectionOverlay.getVariantManagement(), this.sLocalVariantManagementId, "then Variant Management Key successfully set to ObjectPageSubSection (second child) Overlay");
		});

		QUnit.test("when isVariantSwitchAvailable is called with VariantManagement overlay", function(assert) {
			var bAvailable = this.oControlVariantPlugin.isVariantSwitchAvailable(this.oVariantManagementOverlay);
			assert.ok(bAvailable, "then variant switch is available for VariantManagement control");
		});

		QUnit.test("when isVariantSwitchEnabled is called with VariantManagement overlay", function(assert) {
			var oModelData = {};
			oModelData[this.sLocalVariantManagementId] = {
				variants: [
					{key: "variant1"},
					{key: "variant2"}
				]
			};
			var oModel = new VariantModel(oModelData, {}),
				oMockedAppComponent = fnGetMockedAppComponent(oModel);
			sandbox.stub(Utils, "getAppComponentForControl").returns(oMockedAppComponent);
			sandbox.stub(BaseTreeModifier, "getSelector").returns({id: this.sLocalVariantManagementId});

			this.oControlVariantPlugin.registerElementOverlay(this.oVariantManagementOverlay);
			var bEnabled = this.oControlVariantPlugin.isVariantSwitchEnabled(this.oVariantManagementOverlay);
			assert.ok(bEnabled, "then variant switch is enabled for VariantManagement control");
		});

		QUnit.test("when isVariantRenameAvailable is called with VariantManagement overlay", function(assert) {
			var bAvailable = this.oControlVariantPlugin.isVariantRenameAvailable(this.oVariantManagementOverlay);
			assert.ok(bAvailable, "then variant rename is available for VariantManagement control");
		});

		QUnit.test("when isVariantRenameEnabled is called with VariantManagement overlay", function(assert) {
			var bAvailable = this.oControlVariantPlugin.isVariantRenameEnabled(this.oVariantManagementOverlay);
			assert.notOk(bAvailable, "then variant rename is not implemented yet");
		});

		QUnit.test("when isVariantDuplicateAvailable is called with VariantManagement overlay", function(assert) {
			var bAvailable = this.oControlVariantPlugin.isVariantDuplicateAvailable(this.oVariantManagementOverlay);
			assert.ok(bAvailable, "then variant duplicate is available for VariantManagement control");
		});

		QUnit.test("when isVariantDuplicateEnabled is called with VariantManagement overlay", function(assert) {
			var bAvailable = this.oControlVariantPlugin.isVariantDuplicateEnabled(this.oVariantManagementOverlay);
			assert.notOk(bAvailable, "then variant duplicate is not implemented yet");
		});

		QUnit.test("when isVariantConfigureAvailable is called with VariantManagement overlay", function(assert) {
			var bAvailable = this.oControlVariantPlugin.isVariantConfigureAvailable(this.oVariantManagementOverlay);
			assert.ok(bAvailable, "then variant configure is available for VariantManagement control");
		});

		QUnit.test("when isVariantConfigureEnabled is called with VariantManagement overlay", function(assert) {
			var bAvailable = this.oControlVariantPlugin.isVariantConfigureEnabled(this.oVariantManagementOverlay);
			assert.notOk(bAvailable, "then variant configure is not implemented yet");
		});

		QUnit.test("when switchVarint is called", function(assert) {
			var done = assert.async();
			this.oControlVariantPlugin.attachElementModified(function(oEvent) {
				assert.ok(oEvent, "then fireElementModified is called once");
				var oCommand = oEvent.getParameter("command");
				assert.ok(oCommand instanceof ControlVariantSwitch, "then an switchVariant event is recieved with a switch command");
				done();
			});
			this.oControlVariantPlugin.switchVariant(this.oVariantManagementOverlay, "variant2", "variant1");
		});

		QUnit.test("when renameVariant is called", function(assert) {
			assert.ok(this.oControlVariantPlugin.renameVariant, "then renameVariant added to the  ElementOverlay prototype");
		});

		QUnit.test("when duplicateVariant is called", function(assert) {
			assert.ok(this.oControlVariantPlugin.duplicateVariant, "then duplicateVariant added to the  ElementOverlay prototype");
		});

		QUnit.test("when configureVariants is called", function(assert) {
			assert.ok(this.oControlVariantPlugin.configureVariants, "then configureVariants added to the  ElementOverlay prototype");
		});

		//Integration Test
		QUnit.test("when ControlVariant Plugin is added to designTime", function(assert) {
			assert.notOk(this.oButtonOverlay.getVariantManagement(), "then Variant Management Key is initially undefined");
			this.oDesignTime.addPlugin(this.oControlVariantPlugin);
			sap.ui.getCore().applyChanges();
			assert.ok(this.oButtonOverlay.getVariantManagement(), "varMgtKey", "then Variant Management Key successfully propagated from ObjectPageLayout to Button (last element)");
		});
	});