/// <reference path="typings/jquery/jquery.d.ts" />
/// <reference path="typings/angularjs/angular.d.ts" />
/// <reference path="typings/signalr/signalr.d.ts" />

interface IPokerRoomClient {
	addRoomUser(user: Consensus.PokerUser);
	removeRoomUser(user: Consensus.PokerUser);
	disconnectedRoomUser(user: Consensus.PokerUser);

	resetRoom(room: Consensus.PokerRoom);
	showAllCards();
	roomTopicChanged(topic: string);
	cardChanged(card: Consensus.PokerCard);
}

interface IPokerRoomServer {
	join(user: Consensus.PokerUser): JQueryPromise;
	joinRoom(room: Consensus.PokerRoom): JQueryPromise;
	leaveRoom(room: Consensus.PokerRoom, user: Consensus.PokerUser): JQueryPromise;

	resetRoom(room: Consensus.PokerRoom): JQueryPromise;
	showAllCards(room: Consensus.PokerRoom): JQueryPromise;
	changeRoomTopic(room: Consensus.PokerRoom, topic: string): JQueryPromise;
	changedCard(room: Consensus.PokerRoom, value: string): JQueryPromise;
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

		removeRoomUser();
		myCardValueChanged();
		roomTopicChanged();
		resetRoom();
		showAllCards();

		allCardsShowing: bool;

		me: PokerUser;
		room: PokerRoom;
		myCard: PokerCard;
	}

	export class PokerRoomCtrl {
		private _poker: HubProxy;
		
		constructor(private $scope: IPokerRoomScope, private $location: ng.ILocationService, private $cookies: any) {
			this._poker = $.connection.poker;
			var that = this;

			$scope.allCardsShowing = false;

			$scope.myCardValueChanged = function () {
				that.changedMyCardValue($scope.myCard.Value);
			};

			$scope.roomTopicChanged = function () {
				that.changeRoomTopic($scope.room.Topic);
			};

			$scope.closeJoinModal = function () {
				$cookies.userEmail = $scope.me.Email;
				$cookies.userName = $scope.me.Name;
				$scope.joinModal = false;

				that.join(that.getMe());
				$scope.joinRoomModal = !$scope.joinModal && !that.getRoom();
				$scope.$apply();
			};

			$scope.closeJoinRoomModal = function () {
				$location.path("/rooms/" + $scope.room.Name);
				$scope.joinRoomModal = false;

				that.joinRoom(that.getRoom());
			};

			$scope.removeRoomUser = function () {
				that.leaveRoom(this.user);
			};

			$scope.resetRoom = function () {
				that.resetRoom();
			};

			$scope.showAllCards = function () {
				that.showAllCards();
			};

			$scope.joinModalOptions = {
				backdropFade: true,
				dialogFade: true,
				keyboard: true
			};

			this._poker.client.addRoomUser = (user: PokerUser) => this.addRoomUser(user);
			this._poker.client.removeRoomUser = (user: PokerUser) => this.removeRoomUser(user);
			this._poker.client.disconnectedRoomUser = (user: PokerUser) => this.disconnectedRoomUser(user);
			this._poker.client.cardChanged = (card: PokerCard) => this.cardChanged(card);
			this._poker.client.roomTopicChanged = (topic: string) => {
				$scope.room.Topic = topic;
				$scope.$apply();
			};
			this._poker.client.showAllCards = () => {
				$scope.allCardsShowing = true;
				$scope.$apply();
			};
			this._poker.client.resetRoom = (room: PokerRoom) => {
				$scope.room = room;
				$scope.myCard.Value = "";
				$scope.$apply();
			};

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

		private resetRoom(): JQueryPromise {
			return this._poker.server.resetRoom(this.getRoom());
		}

		private showAllCards(): JQueryPromise {
			return this._poker.server.showAllCards(this.getRoom());
		}

		private changeRoomTopic(topic: string): JQueryPromise {
			return this._poker.server.changeRoomTopic(this.getRoom(), topic);
		}

		private changedMyCardValue(value: string): JQueryPromise {
			return this._poker.server.changedCard(this.getRoom(), value);
		}

		private join(user: PokerUser): JQueryPromise {
			var that = this;
			return this._poker.server.join(user).done(function (data) {
				that.$scope.me = data;
				that.$scope.$apply();
			});
		}

		private leaveRoom(user: PokerUser): JQueryPromise {
			return this._poker.server.leaveRoom(this.getRoom(), user);
		}

		private joinRoom(room: PokerRoom) : JQueryPromise {
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

		private removeRoomUser(user: PokerUser) {
			var found = false;

			if (user.Email === this.$scope.me.Email) {
				this.$scope.room = null;
				this.$scope.myCard = null;
				this.$location.path("");
				this.$scope.joinRoomModal = true;
			} else {
				this.$scope.room.Users = this.$scope.room.Users.filter(function (roomUser) {
					return user.Email !== roomUser.Email;
				});
			}

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
		public Topic: string;
		public Users: PokerUser[];
		public Cards: PokerCard[];
	}

	export class PokerCard {
		public User: PokerUser;
		public Value: string;
	}
}