/// <reference path="typings/jquery/jquery.d.ts" />
/// <reference path="typings/angularjs/angular.d.ts" />
/// <reference path="typings/signalr/signalr.d.ts" />

interface IPokerRoomClient {
	addRoomUser(user: Consensus.PokerUser);
	disconnectedRoomUser(user: Consensus.PokerUser);

	cardChanged(card: Consensus.PokerCard);
}

interface IPokerRoomServer {
	join(user: Consensus.PokerUser): JQueryPromise;
	joinRoom(room: Consensus.PokerRoom): JQueryPromise;

	changedCard(room: Consensus.PokerRoom, value: string);
}

interface HubProxy {
	client: IPokerRoomClient;
	server: IPokerRoomServer;
}

interface SignalR {
	poker: HubProxy;
}

module Consensus {
	
	var app = angular.module("consensus", ["ngCookies", "ui.bootstrap"]);

	export interface IPokerRoomScope extends ng.IScope {
		joinModalOptions: Object;

		joinModal: bool;
		closeJoinModal();

		joinRoomModal: bool;
		closeJoinRoomModal();

		myCardValueChanged();

		me: PokerUser;
		room: PokerRoom;
		myCard: PokerCard;
	}

	export class PokerRoomCtrl {
		private _poker: HubProxy;
		
		constructor(private $scope: IPokerRoomScope, private $location: ng.ILocationService, private $cookies: any) {
			this._poker = $.connection.poker;
			var that = this;

			$scope.myCardValueChanged = function () {
				that.changedMyCardValue($scope.myCard.Value);
			};

			$scope.closeJoinModal = function () {
				$cookies.userEmail = $scope.me.Email;
				$cookies.userName = $scope.me.Name;
				$scope.joinModal = false;

				that.join(that.getMe());
				$scope.joinRoomModal = !$scope.joinModal && !this.getRoom();
			};

			$scope.closeJoinRoomModal = function () {
				$location.path("/rooms/" + $scope.room.Name);
				$scope.joinRoomModal = false;

				that.joinRoom(that.getRoom());
			};

			$scope.joinModalOptions = {
				backdropFade: true,
				dialogFade: true,
				keyboard: true
			};

			this._poker.client.addRoomUser = (user: PokerUser) => this.addRoomUser(user);
			this._poker.client.disconnectedRoomUser = (user: PokerUser) => this.disconnectedRoomUser(user);
			this._poker.client.cardChanged = (card: PokerCard) => this.cardChanged(card);

			$.connection.hub.start().done(function () {
				if (that.getMe()) {
					that.join(that.getMe()).done(function () {
						if (that.getRoom()) {
							that.joinRoom(that.getRoom());
						} else {
							$scope.joinRoomModal = true;
							$scope.$apply();
						}
					});
				} else {
					$scope.joinModal = true;
					$scope.$apply();
				}
			});
		}

		getMyCard(): PokerCard {
			var value = this.$scope.myCard;

			if (!value) {
				var userEmail = this.$cookies.userEmail;
				var userName = this.$cookies.userName;

				if (!userEmail)
					return null;

				value = new PokerCard();
				value.User = this.getMe();
				value.Value = "";
			}

			return value;
		}

		getMe(): PokerUser {
			var value = this.$scope.me;

			if (!value) {
				var userEmail = this.$cookies.userEmail;
				var userName = this.$cookies.userName;

				if (!userEmail)
					return null;

				value = new PokerUser();
				value.Name = userName;
				value.Email = userEmail;
			}

			return value;
		}

		getRoom(): PokerRoom {
			var value = this.$scope.room;

			if (!value) {
				var roomName = this.$location.path().replace("/rooms/", "");

				if (!roomName)
					return null;

				value = new PokerRoom();
				value.Name = roomName;
			}

			return value;
		}

		private changedMyCardValue(value: string): JQueryDeferred {
			var that = this;
			return this._poker.server.changedCard(this.getRoom(), value);
		}

		private join(user: PokerUser): JQueryDeferred {
			var that = this;
			return this._poker.server.join(user).done(function (data) {
				that.$scope.me = data;
				that.$scope.$apply();
			});
		}

		private joinRoom(room: PokerRoom) : JQueryDeferred {
			var that = this;
			return this._poker.server.joinRoom(room).done(function (data) {
				that.$scope.room = data;

				var me = that.getMe();
				data.Cards.forEach(function (card) {
					if (card.User.Email === me.Email)
						that.$scope.myCard = card;
				});

				that.$scope.$apply();
			});
		}

		private addRoomUser(user: PokerUser) {
			var found = false;

			this.$scope.room.Users = this.$scope.room.Users.map(function (roomUser) {
				if (user.Email === roomUser.Email) {
					found = true;
					roomUser = user;
				}

				return roomUser;
			});

			if (!found)
				this.$scope.room.Users.push(user);

			this.$scope.$apply();
		}

		private disconnectedRoomUser(user: PokerUser) {
			var found = false;

			this.$scope.room.Users = this.$scope.room.Users.map(function (roomUser) {
				if (user.Email === roomUser.Email) {
					found = true;
					roomUser = user;
				}

				return roomUser;
			});

			if (!found)
				this.$scope.room.Users.push(user);

			this.$scope.$apply();
		}

		private cardChanged(card: PokerCard) {
			var found = false;

			this.$scope.room.Cards = this.$scope.room.Cards.map(function (roomCard) {
				if (card.User.Email === roomCard.User.Email) {
					found = true;
					roomCard = card;
				}

				return roomCard;
			});

			if (!found)
				this.$scope.room.Cards.push(card);

			this.$scope.$apply();
		}
	}

	export class PokerUser {
		public Name: string;
		public Email: string;
		public Disconnected: string;
	}

	export class PokerRoom {
		public Name: string;
		public Users: PokerUser[];
		public Cards: PokerCard[];
	}

	export class PokerCard {
		public User: PokerUser;
		public Value: string;
	}
}