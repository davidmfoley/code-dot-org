import $ from 'jquery';
import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';
import queryString from 'query-string';
import clientState from './clientState';
import DisabledBubblesModal from './DisabledBubblesModal';
import DisabledBubblesAlert from './DisabledBubblesAlert';
import {getStore} from './redux';
import {setViewType, ViewType} from './viewAsRedux';
import {getHiddenLessons} from './hiddenLessonRedux';
import {TestResults} from '@cdo/apps/constants';
import {
  initProgress,
  overwriteResults,
  setScriptProgress,
  disablePostMilestone,
  setIsAge13Required,
  setLessonExtrasEnabled,
  queryUserProgress as reduxQueryUserProgress,
  useDbProgress
} from './progressRedux';
import {setVerified} from '@cdo/apps/code-studio/verifiedInstructorRedux';
import {pageTypes} from '@cdo/apps/templates/teacherDashboard/teacherSectionsRedux';
import {renderTeacherPanel} from './teacherPanelHelpers';

var progress = module.exports;

function showDisabledBubblesModal() {
  const div = $('<div>');
  $(document.body).append(div);

  ReactDOM.render(<DisabledBubblesModal />, div[0]);
}

/**
 * If milestone posts are disabled, show an alert about progress not being tracked.
 */
progress.showDisabledBubblesAlert = function() {
  const store = getStore();
  const {postMilestoneDisabled} = store.getState().progress;
  if (!postMilestoneDisabled) {
    return;
  }

  const div = $('<div>').css({
    position: 'absolute',
    left: 0,
    right: 0,
    top: 45,
    zIndex: 1000
  });
  $(document.body).append(div);

  ReactDOM.render(<DisabledBubblesAlert />, div[0]);
};

/**
 * @param {object} scriptData (Note - This is only a subset of the information
 *   we have in renderCourseProgress)
 * @param {object} lessonData
 * @param {object} progressData
 * @param {string} currentLevelid The id of the level the user is currently on.
 *   This gets used in the url and as a key in many objects. Therefore, it is a
 *   string despite always being a numerical value
 * @param {boolean} saveAnswersBeforeNavigation
 * @param {boolean} signedIn True/false if we know the sign in state of the
 *   user, null otherwise
 * @param {boolean} lessonExtrasEnabled Whether this user is in a section with
 *   lessonExtras enabled for this script
 * @param {boolean} isLessonExtras Boolean indicating we are not on a script
 *   level and therefore are on lesson extras
 * @param {number} currentPageNumber The page we are on if this is a multi-
 *   page level.
 * @returns {Promise<void>}
 */
progress.generateLessonProgress = function(
  scriptData,
  lessonGroupData,
  lessonData,
  progressData,
  currentLevelId,
  saveAnswersBeforeNavigation,
  signedIn,
  lessonExtrasEnabled,
  isLessonExtras,
  currentPageNumber
) {
  const store = getStore();

  const {name, disablePostMilestone, age_13_required} = scriptData;

  initializeStoreWithProgress(
    store,
    {
      name,
      lessonGroups: lessonGroupData,
      lessons: [lessonData],
      disablePostMilestone,
      age_13_required,
      id: lessonData.script_id
    },
    currentLevelId,
    false,
    saveAnswersBeforeNavigation,
    isLessonExtras,
    currentPageNumber
  );

  if (lessonExtrasEnabled) {
    store.dispatch(setLessonExtrasEnabled(true));
  }

  return populateProgress(store, signedIn, progressData, name);
};

/**
 * Populates progress data in the given redux strore.
 * @param {Store} store redux store
 * @param {boolean|null} signedIn true if the user is signed in, false if the
 *    user is not signed in, null if we don't know
 * @param {Object} progressData progress data if it is already known, only used
 *    if signedIn === true
 * @param {string} scriptName
 * @returns {Promise<void>}
 */
function populateProgress(store, signedIn, progressData, scriptName) {
  return getLevelProgress(signedIn, progressData, scriptName).then(data => {
    if (data.usingDbProgress) {
      store.dispatch(useDbProgress());
      clientState.clearProgress();
      store.dispatch(setScriptProgress(data.unitProgress));
    }

    if (data.levelResults) {
      store.dispatch(overwriteResults(data.levelResults));
    }

    if (data.isVerifiedInstructor) {
      store.dispatch(setVerified());
    }

    if (signedIn) {
      progress.showDisabledBubblesAlert();
    }
  });
}

/**
 * Returns a promise that, when resolved, returns an object with two properties:
 * - usingDbProgress: indicates if level progress came from the database
 * - levelResults: map from level id to result
 *
 * This function contains logic that determines whether progress data should
 * come from the data embedded in the html page (passed in as progressData),
 * from session storage, or from an ajax request to the server.
 *
 * @param {boolean|null} signedIn true if the user is signed in, false if the
 *    user is not signed in, null if we don't know
 * @param {Object} progressData progress data if it is already known, only used
 *    if signedIn === true
 * @param {string} scriptName
 * @returns {Promise}
 */
function getLevelProgress(signedIn, progressData, scriptName) {
  switch (signedIn) {
    case true:
      // User is signed in, return a resolved promise with the given progress data
      return Promise.resolve({
        usingDbProgress: true,
        levelResults: extractLevelResults(progressData),
        unitProgress: progressData.progress
      });
    case false:
      // User is not signed in, return a resolved promise with progress data
      // retrieved from session storage
      return Promise.resolve({
        usingDbProgress: false,
        levelResults: clientState.levelProgress(scriptName)
      });
    case null:
      // We do not know if user is signed in or not, send a request to the server
      // to find out if the user is signed in and retrieve progress information
      return $.ajax({
        url: `/api/user_progress/${scriptName}`,
        data: {user_id: clientState.queryParams('user_id')}
      })
        .then(data => {
          if (data.signedIn) {
            return {
              usingDbProgress: true,
              levelResults: extractLevelResults(data),
              unitProgress: data.progress
            };
          } else {
            return {
              usingDbProgress: false,
              levelResults: clientState.levelProgress(scriptName)
            };
          }
        })
        .fail(() =>
          // TODO: Show an error to the user here? (LP-1815)
          console.error(
            'Could not load user progress. User progress may not be saved.'
          )
        );
  }
}

/**
 * Extracts the level results from the response to /api/user_progress.
 * @param {object} userProgressResponse parsed response object to a
 *    /api/user_progress request
 * @returns {Object<string, TestResults>} map from level id to level result
 */
function extractLevelResults(userProgressResponse) {
  return _.mapValues(userProgressResponse.progress, level =>
    level.submitted ? TestResults.SUBMITTED_RESULT : level.result
  );
}

/**
 * @param {object} scriptData
 * @param {string} scriptData.id
 * @param {boolean} scriptData.plc
 * @param {object[]} scriptData.lessons
 * @param {string} scriptData.name
 * @param {boolean} scriptData.hideable_lessons
 * @param {boolean} scriptData.age_13_required
 * Fetch and store progress for the course overview page.
 */
progress.initCourseProgress = function(scriptData) {
  const store = getStore();
  initializeStoreWithProgress(store, scriptData, null, true);
  queryUserProgress(store, scriptData, null);
};

/* Set our initial view type (Participant or Instructor) from current user's user_type
 * or our query string. */
progress.initViewAs = function(store, userType) {
  // Default to Participant, unless current user is a teacher
  let initialViewAs = ViewType.Participant;
  if (userType === 'teacher') {
    //TODO(dmcavoy): Update to check instructor
    initialViewAs = ViewType.Instructor;
  }

  // If current user is not a student (ie, a teacher or signed out), allow the
  // 'viewAs' query parameter to override;
  if (userType !== 'student') {
    //TODO(dmcavoy): Update to check participant
    const query = queryString.parse(location.search);
    initialViewAs = query.viewAs || initialViewAs;
  }

  store.dispatch(setViewType(initialViewAs));
};

progress.retrieveProgress = function(scriptName, scriptData, currentLevelId) {
  const store = getStore();
  return $.getJSON(`/api/script_structure/${scriptName}`, scriptData => {
    initializeStoreWithProgress(store, scriptData, currentLevelId, true);
    queryUserProgress(store, scriptData, currentLevelId);
  });
};

/**
 * Query the server for user_progress data for this script, and update the store
 * as appropriate. If the user is not signed in, level progress data is populated
 * from session storage.
 */
function queryUserProgress(store, scriptData, currentLevelId) {
  const userId = clientState.queryParams('user_id');
  store.dispatch(reduxQueryUserProgress(userId)).then(data => {
    const onOverviewPage = !currentLevelId;
    if (!onOverviewPage) {
      return;
    }

    // If the user is not signed in, retrieve level progress from session storage.
    // (If the user is signed in, level progress would have been set by the call
    // to reduxQueryUserProgress above.)
    if (!data.signedIn) {
      store.dispatch(
        overwriteResults(clientState.levelProgress(scriptData.name))
      );
    }

    const postMilestoneDisabled = store.getState().progress
      .postMilestoneDisabled;
    if (data.signedIn && postMilestoneDisabled) {
      showDisabledBubblesModal();
    }

    if (
      (data.isTeacher || data.teacherViewingStudent) &&
      !data.professionalLearningCourse
    ) {
      const pageType = currentLevelId
        ? pageTypes.level
        : pageTypes.scriptOverview;

      renderTeacherPanel(store, scriptData.id, scriptData.name, pageType);
    }
  });
}

/**
 * Initializes our redux store with initial progress
 * @param {object} store - Our redux store
 * @param {object} scriptData
 * @param {string} scriptData.name
 * @param {boolean} scriptData.disablePostMilestone
 * @param {boolean} [scriptData.plc]
 * @param {object[]} [scriptData.lessons]
 * @param {boolean} scriptData.age_13_required
 * @param {string} currentLevelId The id of the level the user is currently on.
 *   This gets used in the url and as a key in many objects. Therefore, it is a
 *   string despite always being a numerical value
 * @param {boolean} isFullProgress - True if this contains progress for the entire
 *   script vs. a single lesson.
 * @param {boolean} [saveAnswersBeforeNavigation]
 * @param {boolean} [isLessonExtras] Optional boolean indicating we are not on
 *   a script level and therefore are on lesson extras
 * @param {number} [currentPageNumber] Optional. The page we are on if this is
 *   a multi-page level.
 */
function initializeStoreWithProgress(
  store,
  scriptData,
  currentLevelId,
  isFullProgress,
  saveAnswersBeforeNavigation = false,
  isLessonExtras = false,
  currentPageNumber
) {
  store.dispatch(
    initProgress({
      currentLevelId: currentLevelId,
      professionalLearningCourse: scriptData.plc,
      saveAnswersBeforeNavigation: saveAnswersBeforeNavigation,
      lessons: scriptData.lessons,
      lessonGroups: scriptData.lessonGroups,
      peerReviewLessonInfo: scriptData.peerReviewLessonInfo,
      scriptId: scriptData.id,
      scriptName: scriptData.name,
      unitTitle: scriptData.title,
      unitDescription: scriptData.description,
      unitStudentDescription: scriptData.studentDescription,
      courseId: scriptData.course_id,
      isFullProgress: isFullProgress,
      isLessonExtras: isLessonExtras,
      currentPageNumber: currentPageNumber
    })
  );

  if (scriptData.disablePostMilestone) {
    store.dispatch(disablePostMilestone());
  }

  if (scriptData.hideable_lessons) {
    // Note: This call is async
    store.dispatch(getHiddenLessons(scriptData.name, true));
  }

  store.dispatch(setIsAge13Required(scriptData.age_13_required));
}
