pc.extend(pc.fw, function () {
    // Shared math variable to avoid excessive allocation
    var transform = new pc.Mat4();
    var newWtm = new pc.Mat4();

    var position = new pc.Vec3();
    var rotation = new pc.Vec3();
    var scale = new pc.Vec3();

    var ammoRayStart, ammoRayEnd;

    var collisions = {};
    var frameCollisions = {};
    var contacts0 = [];
    var contacts1 = [];

    var EVENT_CONTACT = 'contact';
    var EVENT_COLLISION_START = 'collisionstart';
    var EVENT_COLLISION_END = 'collisionend';
    var EVENT_TRIGGER_ENTER = 'triggerenter';
    var EVENT_TRIGGER_LEAVE = 'triggerleave';

    var FLAG_CONTACT = 1;
    var FLAG_COLLISION_START = 2;
    var FLAG_COLLISION_END = 4;
    var FLAG_TRIGGER_ENTER = 8;
    var FLAG_TRIGGER_LEAVE = 16;
    var FLAG_GLOBAL_CONTACT = 32;

    /**
    * @name pc.fw.RaycastResult
    * @class Object holding the result of a successful raycast hit
    * @constructor Create a new RaycastResul
    * @param {pc.fw.Entity} entity The entity that was hit
    * @param {pc.Vec3} point The point at which the ray hit the entity in world space
    * @param {pc.Vec3} normal The normal vector of the surface where the ray hit in world space.
    * @property {pc.fw.Entity} entity The entity that was hit
    * @property {pc.Vec3} point The point at which the ray hit the entity in world space
    * @property {pc.Vec3} normal The normal vector of the surface where the ray hit in world space.
    */
    var RaycastResult = function (entity, point, normal) {
        this.entity = entity;
        this.point = point;
        this.normal = normal;
    };

    /**
    * @name pc.fw.SingleContactResult
    * @class Object holding the result of a contact between two rigid bodies
    * @constructor Create a new SingleContactResult
    * @param {pc.fw.Entity} a The first entity involved in the contact
    * @param {pc.fw.Entity} b The second entity involved in the contact
    * @param {pc.fw.ContactPoint} contactPoint The contact point between the two entities
    * @property {pc.fw.Entity} a The first entity involved in the contact
    * @property {pc.fw.Entity} b The second entity involved in the contact
    * @property {pc.Vec3} localPointA The point on Entity A where the contact occured, relative to A
    * @property {pc.Vec3} localPointB The point on Entity B where the contact occured, relative to B
    * @property {pc.Vec3} pointA The point on Entity A where the contact occured, in world space
    * @property {pc.Vec3} pointB The point on Entity B where the contact occured, in world space
    * @property {pc.Vec3} normal The normal vector of the contact on Entity B, in world space
    */
    var SingleContactResult = function (a, b, contactPoint) {
        this.a = a;
        this.b = b;
        this.localPointA = contactPoint.localPoint;
        this.localPointB = contactPoint.localPointOther;
        this.pointA = contactPoint.point;
        this.pointB = contactPoint.pointOther;
        this.normal = contactPoint.normal;
    };

    /**
    * @name pc.fw.ContactPoint
    * @class Object holding the result of a contact between two Entities.
    * @constructor Create a new ContactPoint
    * @param {pc.Vec3} localPoint The point on the entity where the contact occured, relative to the entity
    * @param {pc.Vec3} localPointOther The point on the other entity where the contact occured, relative to the other entity
    * @param {pc.Vec3} point The point on the entity where the contact occured, in world space
    * @param {pc.Vec3} pointOther The point on the other entity where the contact occured, in world space
    * @param {pc.Vec3} normal The normal vector of the contact on the other entity, in world space
    * @property {pc.Vec3} localPoint The point on the entity where the contact occured, relative to the entity
    * @property {pc.Vec3} localPointOther The point on the other entity where the contact occured, relative to the other entity
    * @property {pc.Vec3} point The point on the entity where the contact occured, in world space
    * @property {pc.Vec3} pointOther The point on the other entity where the contact occured, in world space
    * @property {pc.Vec3} normal The normal vector of the contact on the other entity, in world space
    */
    var ContactPoint = function (localPoint, localPointOther, point, pointOther, normal) {
        this.localPoint = localPoint;
        this.localPointOther = localPointOther;
        this.point = point;
        this.pointOther = pointOther;
        this.normal = normal;
    }

    /**
    * @name pc.fw.ContactResult
    * @class Object holding the result of a contact between two Entities
    * @constructor Create a new ContactResult
    * @param {pc.fw.Entity} other The entity that was involved in the contact with this entity
    * @param {pc.fw.ContactPoint[]} contacts An array of ContactPoints with the other entity
    * @property {pc.fw.Entity} other The entity that was involved in the contact with this entity
    * @property {pc.fw.ContactPoint[]} contacts An array of ContactPoints with the other entity
    */
    var ContactResult = function(other, contacts) {
        this.other = other;
        this.contacts = contacts;
    }

    // Events Documentation   
    /**
    * @event
    * @name pc.fw.RigidBodyComponentSystem#contact
    * @description Fired when a contact occurs between two rigid bodies
    * @param {pc.fw.SingleContactResult} result Details of the contact between the two bodies
    */

    /**
     * @name pc.fw.RigidBodyComponentSystem
     * @constructor Create a new RigidBodyComponentSystem
     * @class The RigidBodyComponentSystem maintains the dynamics world for simulating rigid bodies, it also controls global values for the world such as gravity.
     * Note: The RigidBodyComponentSystem is only valid if 3D Physics is enabled in your application. You can enable this in the application settings for your Depot.
     * @param {pc.fw.ApplicationContext} context The ApplicationContext
     * @extends pc.fw.ComponentSystem
     */
    var RigidBodyComponentSystem = function RigidBodyComponentSystem (context) {
        this.id = 'rigidbody';
        this.description = "Adds the entity to the scene's physical simulation.";
        context.systems.add(this.id, this);
        
        this.ComponentType = pc.fw.RigidBodyComponent;
        this.DataType = pc.fw.RigidBodyComponentData;

        this.schema = [{
            name: "enabled",
            displayName: "Enabled",
            description: "Enables or disables the rigid body",
            type: "boolean",
            defaultValue: true
        },{
            name: "type",
            displayName: "Type",
            description: "The type of body determines how it moves and collides with other bodies. Dynamic is a normal body. Static will never move. Kinematic can be moved in code, but will not respond to collisions.",
            type: "enumeration",
            options: {
                enumerations: [{
                    name: 'Static',
                    value: pc.fw.RIGIDBODY_TYPE_STATIC
                }, {
                    name: 'Dynamic',
                    value: pc.fw.RIGIDBODY_TYPE_DYNAMIC
                }, {
                    name: 'Kinematic',
                    value: pc.fw.RIGIDBODY_TYPE_KINEMATIC
                }]
            },
            defaultValue: pc.fw.RIGIDBODY_TYPE_STATIC
        }, {
            name: "mass",
            displayName: "Mass",
            description: "The mass of the body",
            type: "number",
            options: {
                min: 0,
                step: 1
            },
            defaultValue: 1,
            filter: {
                'type': [pc.fw.RIGIDBODY_TYPE_DYNAMIC, pc.fw.RIGIDBODY_TYPE_KINEMATIC]
            }
        }, {
            name: "linearDamping",
            displayName: "Linear Damping",
            description: "The linear damping applied to the body",
            type: "number",
            options: {
                min: 0,
                step: 1
            },
            defaultValue: 0,
            filter: {
                'type': [pc.fw.RIGIDBODY_TYPE_DYNAMIC, pc.fw.RIGIDBODY_TYPE_KINEMATIC]
            }
        }, {
            name: "angularDamping",
            displayName: "Angular Damping",
            description: "The angular damping applied to the body",
            type: "number",
            options: {
                min: 0,
                step: 1
            },
            defaultValue: 0,
            filter: {
                'type': [pc.fw.RIGIDBODY_TYPE_DYNAMIC, pc.fw.RIGIDBODY_TYPE_KINEMATIC]
            }
        }, {
            name: "linearFactor",
            displayName: "Linear Factor",
            description: "The linear factor applied to the linear motion of the body, used to contrain linear movement in each axis",
            type: "vector",
            options: {
                min: 0,
                step: 0.1
            },
            defaultValue: [1, 1, 1],
            filter: {
                'type': [pc.fw.RIGIDBODY_TYPE_DYNAMIC, pc.fw.RIGIDBODY_TYPE_KINEMATIC]
            }
        }, {
            name: "angularFactor",
            displayName: "Angular Factor",
            description: "The angular factor applied to the angular motion of the body, used to contrain angular movement in each axis",
            type: "vector",
            options: {
                min: 0,
                step: 0.1
            },
            defaultValue: [1, 1, 1],
            filter: {
                'type': [pc.fw.RIGIDBODY_TYPE_DYNAMIC, pc.fw.RIGIDBODY_TYPE_KINEMATIC]
            }
        }, {
            name: "friction",
            displayName: "Friction",
            description: "The friction when the body slides along another body",
            type: "number",
            options: {
                min: 0,
                step: 0.01
            },
            defaultValue: 0.5
        }, {
            name: "restitution",
            displayName: "Restitution",
            description: "The restitution determines the elasticity of collisions. 0 means an object doesn't bounce at all, a value of 1 will be a perfect reflection",
            type: "number",
            options: {
                min: 0,
                step: 0.01
            },
            defaultValue: 0
        }, {
            name: "body",
            exposed: false
        }];

        this.exposeProperties();

        this.maxSubSteps = 10;
        this.fixedTimeStep = 1/60;
        this.frameCounter = 0;

        // holds all possible collision events in a table that has this form:
        //                         STATIC_RIGID_BODY | NON_STATIC_RIGID_BODY | TRIGGER
        // ------------------------------------------------------------------------------
        // STATIC_RIGID_BODY     |     flags         |        flags          |   flags
        // NON_STATIC_RIGID_BODY |     flags         |        flags          |   flags
        // TRIGGER               |     flags         |        flags          |   flags
        // ------------------------------------------------------------------------------
        this.collisionTable = [
            [0, FLAG_GLOBAL_CONTACT | FLAG_CONTACT | FLAG_COLLISION_START | FLAG_COLLISION_END, 0],
            [FLAG_GLOBAL_CONTACT | FLAG_CONTACT | FLAG_COLLISION_START | FLAG_COLLISION_END, FLAG_GLOBAL_CONTACT | FLAG_CONTACT | FLAG_COLLISION_START | FLAG_COLLISION_END, FLAG_TRIGGER_ENTER | FLAG_TRIGGER_LEAVE],
            [0, FLAG_TRIGGER_ENTER | FLAG_TRIGGER_LEAVE, 0]
        ];

        this.collisionFlagsCache = {};
        this.hasContactEvents = false;

        this.on('remove', this.onRemove, this);

        pc.fw.ComponentSystem.on('update', this.onUpdate, this);
    };
    RigidBodyComponentSystem = pc.inherits(RigidBodyComponentSystem, pc.fw.ComponentSystem);
    
    pc.extend(RigidBodyComponentSystem.prototype, {
        onLibraryLoaded: function () {
            // Create the Ammo physics world
            if (typeof(Ammo) !== 'undefined') {
                var collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
                var dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
                var overlappingPairCache = new Ammo.btDbvtBroadphase();
                var solver = new Ammo.btSequentialImpulseConstraintSolver();
                this.dynamicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);

                this._ammoGravity = new Ammo.btVector3(0, -9.82, 0);
                this.dynamicsWorld.setGravity(this._ammoGravity);
                
                // Lazily create temp vars
                ammoRayStart = new Ammo.btVector3();
                ammoRayEnd = new Ammo.btVector3();
            } else {
                // Unbind the update function if we haven't loaded Ammo by now
                pc.fw.ComponentSystem.off('update', this.onUpdate, this);
            }
        },

        initializeComponentData: function (component, data, properties) {
            // backwards compatibility
            if (data.bodyType) {
                data.type = data.bodyType;
                console.warn("WARNING: rigidbody.bodyType: Property is deprecated. Use type instead.");
            }

            if (data.linearFactor && pc.type(data.linearFactor) === 'array') {
                data.linearFactor = new pc.Vec3(data.linearFactor[0], data.linearFactor[1], data.linearFactor[2]);
            }
            if (data.angularFactor && pc.type(data.angularFactor) === 'array') {
                data.angularFactor = new pc.Vec3(data.angularFactor[0], data.angularFactor[1], data.angularFactor[2]);
            }

            properties = ['enabled', 'mass', 'linearDamping', 'angularDamping', 'linearFactor', 'angularFactor', 'friction', 'restitution', 'type'];
            RigidBodyComponentSystem._super.initializeComponentData.call(this, component, data, properties);

            component.createBody();
        },

        cloneComponent: function (entity, clone) {
            // create new data block for clone
            var data = {
                enabled: entity.rigidbody.enabled,
                mass: entity.rigidbody.mass,
                linearDamping: entity.rigidbody.linearDamping,
                angularDamping: entity.rigidbody.angularDamping,
                linearFactor: [entity.rigidbody.linearFactor.x, entity.rigidbody.linearFactor.y, entity.rigidbody.linearFactor.z],
                angularFactor: [entity.rigidbody.angularFactor.x, entity.rigidbody.angularFactor.y, entity.rigidbody.angularFactor.z],
                friction: entity.rigidbody.friction,
                restitution: entity.rigidbody.restitution,
                type: entity.rigidbody.type
            };

            this.addComponent(clone, data);
        },

        addComponent: function (entity, data) {
            RigidBodyComponentSystem._super.addComponent.call(this, entity, data);

            this.collisionFlagsCache[entity.getGuid()] = {
                flags: 0,
                type: data.type,
                frameCounter: -1
            }
        },

        registerTrigger: function (entity) {
            this.collisionFlagsCache[entity.getGuid()] = {
                flags: 0,
                frameCounter: -1
            }
        },

        unregisterTrigger: function (entity) {
            delete this.collisionFlagsCache[entity.getGuid()];
        },

        onRemove: function (entity, data) {
            if (data.body) {
                this.removeBody(data.body);    
                Ammo.destroy(data.body);
            }
            
            data.body = null;

            delete this.collisionFlagsCache[entity.getGuid()];
        },

        addBody: function (body) {
            this.dynamicsWorld.addRigidBody(body);
            return body;
        },

        removeBody: function (body) {
            this.dynamicsWorld.removeRigidBody(body);
        },

        addConstraint: function (constraint) {
            this.dynamicsWorld.addConstraint(constraint);
            return constraint;
        },

        removeConstraint: function (constraint) {
            this.dynamicsWorld.removeConstraint(constraint);
        },

        /**
        * @function
        * @name pc.fw.RigidBodyComponentSystem#setGravity
        * @description Set the gravity vector for the 3D physics world
        * @param {Number} x The x-component of the gravity vector
        * @param {Number} y The y-component of the gravity vector
        * @param {Number} z The z-component of the gravity vector
        */
        /**
        * @function
        * @name pc.fw.RigidBodyComponentSystem#setGravity^2
        * @description Set the gravity vector for the 3D physics world
        * @param {pc.Vec3} gravity The gravity vector to use for the 3D physics world.
        */
        setGravity: function () {
            var x, y, z;
            if (arguments.length === 1) {
                x = arguments[0].x;
                y = arguments[0].y;
                z = arguments[0].z;
            } else {
                x = arguments[0];
                y = arguments[1];
                z = arguments[2];
            }
            this._ammoGravity.setValue(x, y, z);
            this.dynamicsWorld.setGravity(this._ammoGravity);
        },

        /**
        * @function
        * @name pc.fw.RigidBodyComponentSystem#raycastFirst
        * @description Raycast the world and return the first entity the ray hits. Fire a ray into the world from start to end, 
        * if the ray hits an entity with a rigidbody component, the callback function is called along with a {@link pc.fw.RaycastResult}.
        * @param {pc.Vec3} start The world space point where the ray starts
        * @param {pc.Vec3} end The world space point where the ray ends
        * @param {Function} callback Function called if ray hits another body. Passed a single argument: a {@link pc.fw.RaycastResult} object
        */
        raycastFirst: function (start, end, callback) {
            ammoRayStart.setValue(start.x, start.y, start.z);
            ammoRayEnd.setValue(end.x, end.y, end.z);
            var rayCallback = new Ammo.ClosestRayResultCallback(ammoRayStart, ammoRayEnd);

            this.dynamicsWorld.rayTest(ammoRayStart, ammoRayEnd, rayCallback);
            if (rayCallback.hasHit()) {
                var collisionObjPtr = rayCallback.get_m_collisionObject();
                var collisionObj = Ammo.wrapPointer(collisionObjPtr, Ammo.btCollisionObject);
                var body = btRigidBody.prototype.upcast(collisionObj);
                var point = rayCallback.get_m_hitPointWorld();
                var normal = rayCallback.get_m_hitNormalWorld();

                if (body) {
                    callback(new RaycastResult(
                                    body.entity, 
                                    new pc.Vec3(point.x(), point.y(), point.z()),
                                    new pc.Vec3(normal.x(), normal.y(), normal.z())
                                )
                            );
                }
            }

            Ammo.destroy(rayCallback);
        },

        /**
        * @private
        * @function
        * @name pc.fw.RigidBodyComponentSystem#_storeCollision
        * @description Stores a collision between the entity and other in the contacts map and returns true if it is a new collision
        * if the ray hits an entity with a rigidbody component, the callback function is called along with a {@link pc.fw.RaycastResult}.
        * @param {pc.fw.Entity} entity The entity 
        * @param {pc.fw.Entity} other The entity that collides with the first entity
        */
        _storeCollision: function (entity, other) {   
            var isNewCollision = false;
            var guid = entity.getGuid();

            collisions[guid] = collisions[guid] || {others: [], entity: entity};

            if (collisions[guid].others.indexOf(other) < 0) {
                collisions[guid].others.push(other);
                isNewCollision = true;
            }
            
            frameCollisions[guid] = frameCollisions[guid] || {others: [], entity: entity};
            frameCollisions[guid].others.push(other);
            
            return isNewCollision;
        },

        /**
        * @private
        * @function
        * @name pc.fw.RigidBodyComponentSystem#_handleEntityCollision
        * @description Fires a contact event if there is a collison between the two entities and a collisionstart event
        * if it is a new coliision
        * @param {pc.fw.Entity} entity The entity 
        * @param {pc.fw.Entity} other The entity that collides with the first entity
        * @param {pc.fw.ContactPoint[]} contactPoints An array of contacts points between the two entities
        */
        _handleEntityCollision: function (entity, other, contactPoints, collisionFlags) {
            var result;

            if (collisionFlags & FLAG_CONTACT) {
                result = new ContactResult(other, contactPoints);
                entity.collision.fire(EVENT_CONTACT, result);
            }

            if (collisionFlags & (FLAG_COLLISION_START | FLAG_TRIGGER_ENTER | FLAG_COLLISION_END | FLAG_TRIGGER_LEAVE)) {
                if (this._storeCollision(entity, other)) {
                    if (collisionFlags & FLAG_COLLISION_START) {
                        result = result || new ContactResult(other, contactPoints);
                        entity.collision.fire(EVENT_COLLISION_START, result);
                    }

                    if (collisionFlags & FLAG_TRIGGER_ENTER) {
                        entity.collision.fire(EVENT_TRIGGER_ENTER, other);
                    }
                }
            }
        },

        _createContactPointFromAmmo: function (contactPoint) {
            var localPointA = new pc.Vec3(contactPoint.get_m_localPointA().x(), contactPoint.get_m_localPointA().y(), contactPoint.get_m_localPointA().z());
            var localPointB = new pc.Vec3(contactPoint.get_m_localPointB().x(), contactPoint.get_m_localPointB().y(), contactPoint.get_m_localPointB().z());
            var pointA = new pc.Vec3(contactPoint.getPositionWorldOnA().x(), contactPoint.getPositionWorldOnA().y(), contactPoint.getPositionWorldOnA().z());
            var pointB = new pc.Vec3(contactPoint.getPositionWorldOnB().x(), contactPoint.getPositionWorldOnB().y(), contactPoint.getPositionWorldOnB().z());
            var normal = new pc.Vec3(contactPoint.get_m_normalWorldOnB().x(), contactPoint.get_m_normalWorldOnB().y(), contactPoint.get_m_normalWorldOnB().z());
            return new ContactPoint(localPointA, localPointB, pointA, pointB, normal);
        },

        _createReverseContactPointFromAmmo: function (contactPoint) {
            var localPointA = new pc.Vec3(contactPoint.get_m_localPointA().x(), contactPoint.get_m_localPointA().y(), contactPoint.get_m_localPointA().z());
            var localPointB = new pc.Vec3(contactPoint.get_m_localPointB().x(), contactPoint.get_m_localPointB().y(), contactPoint.get_m_localPointB().z());
            var pointA = new pc.Vec3(contactPoint.getPositionWorldOnA().x(), contactPoint.getPositionWorldOnA().y(), contactPoint.getPositionWorldOnA().z());
            var pointB = new pc.Vec3(contactPoint.getPositionWorldOnB().x(), contactPoint.getPositionWorldOnB().y(), contactPoint.getPositionWorldOnB().z());
            var normal = new pc.Vec3(-contactPoint.get_m_normalWorldOnB().x(), -contactPoint.get_m_normalWorldOnB().y(), -contactPoint.get_m_normalWorldOnB().z());
            return new ContactPoint(localPointB, localPointA, pointB, pointA, normal);
        },

        /**
        * @private
        * @function
        * @name pc.fw.RigidBodyComponentSystem#_cleanOldCollisions
        * @description Removes collisions that no longer exist from the collisions list and fires collisionend events to the
        * related entities.
        */
        _cleanOldCollisions: function () {
            var getCollisionFlags = this._getCollisionFlags.bind(this);
            var getEntityCollisionFlags = this._getEntityCollisionFlags.bind(this);

            for (var guid in collisions) {
                if (collisions.hasOwnProperty(guid)) {

                    var entity = collisions[guid].entity;
                    var entityFlags = getEntityCollisionFlags(entity);

                    var entityCollision = entity.collision;
                    var others = collisions[guid].others;
                    var length = others.length;
                    var i=length;

                    while (i--) {
                        var other = others[i];
                        // if the contact does not exist in the current frame collisions then fire event
                        if (!frameCollisions[guid] || frameCollisions[guid].others.indexOf(other) < 0) {
                            others.splice(i, 1);

                            if (entityFlags.flags && other.collision) {
                                var otherFlags = getEntityCollisionFlags(other);
                                var flags = getCollisionFlags(entityFlags, otherFlags);

                                if (flags & FLAG_COLLISION_END) {
                                    entityCollision.fire(EVENT_COLLISION_END, other);
                                }

                                if (flags & FLAG_TRIGGER_LEAVE) {
                                    entityCollision.fire(EVENT_TRIGGER_LEAVE, other);
                                }
                            }
                            
                        }
                    }  

                    if (others.length === 0) {
                        delete collisions[guid];
                    }          
                }
            } 
        },

        /**
         * Returns a number that contains flags for collision events
         * that the specified entity has listeners for. These flags 
         * are returned from the collisionFlagsCache unless this is a 
         * new frame in which case they will be recalculated and stored in 
         * the cache.
         */
        _getEntityCollisionFlags: function (entity) {
            var cache = this.collisionFlagsCache[entity._guid];

            if (cache.frameCounter !== this.frameCounter) {
                var flags = 0;
                var collision = entity.collision;
                var e;

                if (collision) {
                    var cb = collision._callbacks;
                    if (cb) {
                        e = cb.contact;
                        if (e && e.length > 0) {
                            flags = flags | FLAG_CONTACT;
                        }

                        e = cb.collisionstart;
                        if (e && e.length > 0) {
                            flags = flags | FLAG_COLLISION_START;
                        }

                        e = cb.collisionend;
                        if (e && e.length > 0) {
                            flags = flags | FLAG_COLLISION_END;
                        }

                        e = cb.triggerenter;
                        if (e && e.length > 0) {
                            flags = flags | FLAG_TRIGGER_ENTER;
                        }

                        e = cb.triggerleave;
                        if (e && e.length > 0) {
                            flags = flags | FLAG_TRIGGER_LEAVE;
                        }
                    }
                    
                }

                // global contacts
                if (this.hasContactEvents) {
                    flags = flags | FLAG_GLOBAL_CONTACT;
                }

                cache.flags = flags;
                cache.frameCounter = this.frameCounter;
            }

            return cache;
        },

        /**
         * Gets a number that contains flags for collision events
         * that should be fired when the two entities collide.
         */
        _getCollisionFlags: function (firstEntityCache, secondEntityCache) {
            // find flags cell in collision table
            var row = 0;
            var col = 0;

            if (firstEntityCache.type) {
                if (firstEntityCache.type !== pc.fw.RIGIDBODY_TYPE_STATIC) {
                    row = 1; // non static rigid body
                }
            } else {
                row = 2; // trigger
            }

            if (secondEntityCache.type) {
                if (secondEntityCache.type !== pc.fw.RIGIDBODY_TYPE_STATIC) {
                    col = 1; // non static rigid body
                }
            } else {
                col = 2; // trigger
            }

            return firstEntityCache.flags & this.collisionTable[row][col];
        },


        onUpdate: function (dt) {
            // advance the frame counter so that collision flags will be  
            // recalculated for this frame
            this.frameCounter = (this.frameCounter + 1) % Number.MAX_VALUE; 

            var collisionFlagsCache = this.collisionFlagsCache;

            // Update the transforms of all bodies
            this.dynamicsWorld.stepSimulation(dt, this.maxSubSteps, this.fixedTimeStep);

            // Update the transforms of all entities referencing a body
            var components = this.store;
            for (var id in components) {
                if (components.hasOwnProperty(id)) {
                    var entity = components[id].entity;
                    var componentData = components[id].data;
                    if (componentData.body && componentData.body.isActive() && componentData.enabled && entity.enabled) {
                        // update cached type in case it was changed by scripts
                        collisionFlagsCache[id].type = componentData.type; 

                        if (componentData.type === pc.fw.RIGIDBODY_TYPE_DYNAMIC) {
                            entity.rigidbody.syncBodyToEntity();
                        } else if (componentData.type === pc.fw.RIGIDBODY_TYPE_KINEMATIC) {
                            entity.rigidbody.updateKinematic(dt);
                        } 
                    }

                }
            }

            // cache references to methods and variables for better performance
            var dispatcher = this.dynamicsWorld.getDispatcher();
            var numManifolds = dispatcher.getNumManifolds();
            var i, j;
            var getCollisionFlags = this._getCollisionFlags.bind(this);
            var getEntityCollisionFlags = this._getEntityCollisionFlags.bind(this);
            var handleEntityCollision = this._handleEntityCollision.bind(this);
            var createContactPointFromAmmo = this._createContactPointFromAmmo.bind(this);
            var createReverseContactPointFromAmmo = this._createReverseContactPointFromAmmo.bind(this);
            var frameCounter = this.frameCounter;

            frameCollisions = {};

            this.hasContactEvents = this.hasEvent(EVENT_CONTACT);

            // loop through the all contacts and fire events
            for (i = 0; i < numManifolds; i++) {
                var manifold = dispatcher.getManifoldByIndexInternal(i);
                var numContacts = manifold.getNumContacts();
                if (numContacts > 0) {
                    var body0 = manifold.getBody0();
                    var body1 = manifold.getBody1();
                    var wb0 = btRigidBody.prototype['upcast'](body0);
                    var wb1 = btRigidBody.prototype['upcast'](body1);
                    var e0 = wb0.entity;
                    var e1 = wb1.entity;

                    // check if entity is null - TODO: investigate when this happens
                    if (!e0 || !e1) {
                        continue;
                    }

                    var flags0 = getEntityCollisionFlags(e0);
                    var flags1 = getEntityCollisionFlags(e1);
                    var collisionFlags0 = flags0.flags ? getCollisionFlags(flags0, flags1) : 0;
                    var collisionFlags1 = flags1.flags ? getCollisionFlags(flags1, flags0) : 0;

                    // do some early checks for optimization
                    if (collisionFlags0 || collisionFlags1) {

                        var cachedContactPoint, cachedContactResult;
                        var useContacts0 = collisionFlags0 & (FLAG_COLLISION_START | FLAG_CONTACT);
                        var useContacts1 = collisionFlags1 & (FLAG_COLLISION_START | FLAG_CONTACT);
                        contacts0.length = 0;
                        contacts1.length = 0;

                        for (j = 0; j < numContacts; j++) {
                            var contactPoint = manifold.getContactPoint(j);

                            if (collisionFlags0 & FLAG_GLOBAL_CONTACT) {
                                cachedContactPoint = createContactPointFromAmmo(contactPoint);
                                this.fire(EVENT_CONTACT, new SingleContactResult(e0, e1, cachedContactPoint));
                            }

                            if (useContacts0) {
                                cachedContactPoint = cachedContactPoint || createContactPointFromAmmo(contactPoint);
                                contacts0.push(cachedContactPoint);
                            }

                            if (useContacts1) {
                                contacts1.push(createReverseContactPointFromAmmo(contactPoint));
                            }
                        }

                        handleEntityCollision(e0, e1, contacts0, collisionFlags0);                        
                        handleEntityCollision(e1, e0, contacts1, collisionFlags1);
                    }
                }
            }                

            // check for collisions that no longer exist and fire events
            this._cleanOldCollisions();         
        }
    });

    return {
        /** 
        * @enum pc.fw.RIGIDBODY_TYPE
        * @name pc.fw.RIGIDBODY_TYPE_STATIC
        * @description Static rigid bodies have infinite mass and can never move. You cannot apply forces or impulses to them or set their velocity.
        */
        RIGIDBODY_TYPE_STATIC: 'static',
        /** 
        * @enum pc.fw.RIGIDBODY_TYPE
        * @name pc.fw.RIGIDBODY_TYPE_DYNAMIC
        * @description Dynamic rigid bodies are simulated according to the forces acted on them. They have a positive, non-zero mass.
        */
        RIGIDBODY_TYPE_DYNAMIC: 'dynamic',
        /** 
        * @enum pc.fw.RIGIDBODY_TYPE
        * @name pc.fw.RIGIDBODY_TYPE_KINEMATIC
        * @description Kinematic rigid bodies are objects with infinite mass but can be moved by directly setting their velocity. You cannot apply forces or impulses to them.
        */
        RIGIDBODY_TYPE_KINEMATIC: 'kinematic',

        // Collision flags from AmmoJS
        RIGIDBODY_CF_STATIC_OBJECT: 1,
        RIGIDBODY_CF_KINEMATIC_OBJECT: 2,
        RIGIDBODY_CF_NORESPONSE_OBJECT: 4,

        // Activation states from AmmoJS
        RIGIDBODY_ACTIVE_TAG: 1,
        RIGIDBODY_ISLAND_SLEEPING: 2,
        RIGIDBODY_WANTS_DEACTIVATION: 3,
        RIGIDBODY_DISABLE_DEACTIVATION: 4,
        RIGIDBODY_DISABLE_SIMULATION: 5,
 
        RigidBodyComponentSystem: RigidBodyComponentSystem
    };
}());