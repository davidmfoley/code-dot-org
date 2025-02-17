import React from 'react';
import ReactDOM from 'react-dom';
import TeacherApplication from '@cdo/apps/code-studio/pd/application/teacher/TeacherApplication';
import getScriptData from '@cdo/apps/util/getScriptData';
import experiments from '@cdo/apps/util/experiments';

document.addEventListener('DOMContentLoaded', function(event) {
  ReactDOM.render(
    <TeacherApplication
      {...getScriptData('props')}
      allowPartialSaving={experiments.isEnabled(
        experiments.TEACHER_APPLICATION_SAVING_REOPENING
      )}
    />,
    document.getElementById('application-container')
  );
});
